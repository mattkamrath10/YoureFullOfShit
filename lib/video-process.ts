"use client";

import { fetchFile, loadFFmpeg, terminateFFmpeg } from "@/lib/ffmpeg-client";

/**
 * Additive Free-plan video prep for Last Storyteller.
 * Compress toward ~45 MB; size-aware split fallback. Never uploads the original oversized file.
 * Uses single-threaded FFmpeg.wasm (no COOP/COEP / core-mt).
 */

export const VIDEO_DIRECT_MAX = 50 * 1024 * 1024;
export const VIDEO_SAFE_TARGET = 45 * 1024 * 1024;
export const VIDEO_PART_TARGET = 42 * 1024 * 1024;
export const VIDEO_UPLOAD_CEILING = 48 * 1024 * 1024;
/** Refuse absurd locals that would melt phones */
export const VIDEO_PROCESS_MAX = 1024 * 1024 * 1024; // 1 GB

export type VideoProcessProgress = {
  phase: "loading" | "compressing" | "splitting" | "done" | "cancelled" | "error";
  message: string;
  /** 0–1 when known */
  ratio?: number;
};

export type VideoProcessResult =
  | {
      ok: true;
      files: File[];
      mode: "passthrough" | "compressed" | "split";
      message: string;
    }
  | { ok: false; error: string; cancelled?: boolean };

type FFmpegInstance = {
  writeFile: (name: string, data: Uint8Array) => Promise<void>;
  readFile: (name: string) => Promise<Uint8Array | string>;
  deleteFile: (name: string) => Promise<void>;
  listDir: (path: string) => Promise<Array<{ name: string; isDir: boolean }>>;
  exec: (args: string[]) => Promise<void>;
  on: (event: string, cb: (payload: { progress: number; time: number }) => void) => void;
};

let cancelFlag = false;

export function cancelVideoProcessing() {
  cancelFlag = true;
  terminateFFmpeg();
}

function throwIfCancelled() {
  if (cancelFlag) {
    const err = new Error("cancelled");
    (err as Error & { cancelled?: boolean }).cancelled = true;
    throw err;
  }
}

async function getFFmpeg(
  onProgress?: (p: VideoProcessProgress) => void,
): Promise<FFmpegInstance> {
  onProgress?.({
    phase: "loading",
    message: "Preparing your story video…",
  });
  const ffmpeg = await loadFFmpeg((message) => {
    onProgress?.({ phase: "loading", message });
  });
  return ffmpeg as unknown as FFmpegInstance;
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => {
      const d = video.duration;
      cleanup();
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error("Could not read video duration."));
        return;
      }
      resolve(d);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read this video on this device."));
    };
    video.src = url;
  });
}

function formatMb(n: number): string {
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "story-video";
}

async function readOutputFile(
  ffmpeg: FFmpegInstance,
  name: string,
  downloadName: string,
): Promise<File> {
  const data = await ffmpeg.readFile(name);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  // Copy into a fresh ArrayBuffer-backed Uint8Array for BlobPart typing
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy], downloadName, { type: "video/mp4" });
}

async function compressOnce(
  ffmpeg: FFmpegInstance,
  inputName: string,
  outputName: string,
  opts: { height: number; videoKbps: number; audioKbps: number },
  onProgress?: (p: VideoProcessProgress) => void,
): Promise<void> {
  throwIfCancelled();
  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.({
      phase: "compressing",
      message: "Compressing video…",
      ratio: Math.min(0.99, Math.max(0, progress || 0)),
    });
  });
  await ffmpeg.exec([
    "-i",
    inputName,
    "-vf",
    `scale=-2:'min(${opts.height},ih)'`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    `${opts.videoKbps}k`,
    "-maxrate",
    `${Math.round(opts.videoKbps * 1.2)}k`,
    "-bufsize",
    `${Math.round(opts.videoKbps * 2)}k`,
    "-c:a",
    "aac",
    "-b:a",
    `${opts.audioKbps}k`,
    "-ac",
    "2",
    "-ar",
    "44100",
    "-movflags",
    "+faststart",
    "-y",
    outputName,
  ]);
}

function bitrateForTarget(durationSec: number, targetBytes: number, audioKbps: number): number {
  const totalBits = targetBytes * 8;
  const audioBits = audioKbps * 1000 * durationSec;
  const videoBits = Math.max(totalBits - audioBits, 200_000 * durationSec);
  const kbps = Math.floor(videoBits / durationSec / 1000);
  return Math.min(2500, Math.max(250, kbps));
}

async function splitBySizeBudget(
  ffmpeg: FFmpegInstance,
  inputName: string,
  source: File,
  durationSec: number,
  onProgress?: (p: VideoProcessProgress) => void,
): Promise<File[]> {
  throwIfCancelled();
  onProgress?.({
    phase: "splitting",
    message: "Splitting video if necessary…",
  });

  const partCount = Math.max(2, Math.ceil(source.size / VIDEO_PART_TARGET));
  const segmentTime = Math.max(2, durationSec / partCount);

  const pattern = "part_%03d.mp4";
  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.({
      phase: "splitting",
      message: "Splitting video if necessary…",
      ratio: Math.min(0.99, Math.max(0, progress || 0)),
    });
  });

  // Re-encode segments for predictable sizes (copy can still produce fat keyframe chunks)
  const audioKbps = 96;
  const perPartBudget = Math.min(VIDEO_PART_TARGET, Math.ceil(source.size / partCount));
  const videoKbps = bitrateForTarget(segmentTime, perPartBudget, audioKbps);

  await ffmpeg.exec([
    "-i",
    inputName,
    "-vf",
    "scale=-2:'min(720,ih)'",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    `${videoKbps}k`,
    "-c:a",
    "aac",
    "-b:a",
    `${audioKbps}k`,
    "-f",
    "segment",
    "-segment_time",
    String(segmentTime.toFixed(2)),
    "-reset_timestamps",
    "1",
    "-movflags",
    "+faststart",
    "-y",
    pattern,
  ]);

  const entries = await ffmpeg.listDir("/");
  const partNames = entries
    .map((e) => e.name)
    .filter((n) => /^part_\d+\.mp4$/.test(n))
    .sort();

  if (partNames.length === 0) {
    throw new Error("Split produced no video parts.");
  }

  const stem = baseName(source.name);
  const files: File[] = [];
  for (let i = 0; i < partNames.length; i++) {
    throwIfCancelled();
    let part = await readOutputFile(
      ffmpeg,
      partNames[i],
      `${stem}-part${i + 1}-of-${partNames.length}.mp4`,
    );
    // If a part still exceeds ceiling, re-encode that chunk more aggressively once
    if (part.size > VIDEO_UPLOAD_CEILING) {
      const tmpIn = `fat_${i}.mp4`;
      const tmpOut = `slim_${i}.mp4`;
            await ffmpeg.writeFile(tmpIn, await fetchFile(part));
      const dur = Math.max(2, durationSec / partNames.length);
      const kbps = bitrateForTarget(dur, VIDEO_PART_TARGET, 64);
      await compressOnce(
        ffmpeg,
        tmpIn,
        tmpOut,
        { height: 540, videoKbps: kbps, audioKbps: 64 },
        onProgress,
      );
      part = await readOutputFile(
        ffmpeg,
        tmpOut,
        `${stem}-part${i + 1}-of-${partNames.length}.mp4`,
      );
      try {
        await ffmpeg.deleteFile(tmpIn);
        await ffmpeg.deleteFile(tmpOut);
      } catch {
        /* ignore */
      }
    }
    if (part.size > VIDEO_DIRECT_MAX) {
      throw new Error(
        `A video part is still too large (${formatMb(part.size)}). Please trim the original and try again.`,
      );
    }
    files.push(part);
    try {
      await ffmpeg.deleteFile(partNames[i]);
    } catch {
      /* ignore */
    }
  }
  return files;
}

/**
 * If under direct limit → passthrough.
 * Else compress toward ~45 MB; if still too big → size-aware split.
 */
export async function processVideoForUpload(
  file: File,
  onProgress?: (p: VideoProcessProgress) => void,
): Promise<VideoProcessResult> {
  cancelFlag = false;

  if (file.size <= VIDEO_DIRECT_MAX) {
    return {
      ok: true,
      files: [file],
      mode: "passthrough",
      message: `Ready — ${formatMb(file.size)}`,
    };
  }

  if (file.size > VIDEO_PROCESS_MAX) {
    return {
      ok: false,
      error:
        "This video is too large to prepare on this device (over 1 GB). Please trim or compress it first, then try again.",
    };
  }

  onProgress?.({
    phase: "loading",
    message: "Video is too large for direct upload. Preparing your story video…",
  });

  try {
    const duration = await getVideoDuration(file);
    throwIfCancelled();
    const ffmpeg = await getFFmpeg(onProgress);
    throwIfCancelled();

        const inputName = "input_src";
    const out1 = "out_720.mp4";
    const out2 = "out_540.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const audioKbps = 96;
    const kbps720 = bitrateForTarget(duration, VIDEO_SAFE_TARGET, audioKbps);

    onProgress?.({
      phase: "compressing",
      message: "Compressing video…",
      ratio: 0,
    });
    await compressOnce(
      ffmpeg,
      inputName,
      out1,
      { height: 720, videoKbps: kbps720, audioKbps },
      onProgress,
    );
    throwIfCancelled();

    let result = await readOutputFile(ffmpeg, out1, `${baseName(file.name)}-optimized.mp4`);

    if (result.size > VIDEO_UPLOAD_CEILING) {
      const kbps540 = Math.max(200, Math.floor(kbps720 * 0.65));
      onProgress?.({
        phase: "compressing",
        message: "Compressing video…",
        ratio: 0,
      });
      await compressOnce(
        ffmpeg,
        inputName,
        out2,
        { height: 540, videoKbps: kbps540, audioKbps: 64 },
        onProgress,
      );
      throwIfCancelled();
      result = await readOutputFile(ffmpeg, out2, `${baseName(file.name)}-optimized.mp4`);
    }

    if (result.size <= VIDEO_UPLOAD_CEILING) {
      onProgress?.({
        phase: "done",
        message: `Video optimized — ${formatMb(result.size)}`,
        ratio: 1,
      });
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(out1);
        await ffmpeg.deleteFile(out2);
      } catch {
        /* ignore */
      }
      return {
        ok: true,
        files: [result],
        mode: "compressed",
        message: `Video optimized — ${formatMb(result.size)}`,
      };
    }

    // Split fallback on the compressed (or best-effort) file
    const splitSourceName = result.size < file.size ? "split_src.mp4" : inputName;
    if (splitSourceName === "split_src.mp4") {
            await ffmpeg.writeFile(splitSourceName, await fetchFile(result));
    }

    const parts = await splitBySizeBudget(
      ffmpeg,
      splitSourceName,
      result.size < file.size ? result : file,
      duration,
      onProgress,
    );

    onProgress?.({
      phase: "done",
      message: `Video prepared as ${parts.length} parts`,
      ratio: 1,
    });

    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(out1);
      await ffmpeg.deleteFile(out2);
      if (splitSourceName === "split_src.mp4") await ffmpeg.deleteFile(splitSourceName);
    } catch {
      /* ignore */
    }

    return {
      ok: true,
      files: parts,
      mode: "split",
      message: `Video prepared as ${parts.length} parts`,
    };
  } catch (e) {
    const cancelled =
      cancelFlag ||
      (e instanceof Error &&
        ((e as Error & { cancelled?: boolean }).cancelled || e.message === "cancelled"));
    if (cancelled) {
      onProgress?.({ phase: "cancelled", message: "Processing cancelled." });
      return { ok: false, error: "Processing cancelled.", cancelled: true };
    }
    console.error("[last-storyteller video-process]", e);
    onProgress?.({
      phase: "error",
      message: "Unable to prepare this video on this device.",
    });
    return {
      ok: false,
      error:
        "Unable to prepare this video on this device. Try a shorter clip, Chrome or Edge on desktop, or trim it under 50 MB.",
    };
  }
}
