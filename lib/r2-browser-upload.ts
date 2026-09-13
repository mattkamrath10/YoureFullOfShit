"use client";

/** Browser multipart uploader for YFOS → Cloudflare R2 (no secrets in client). */

export type R2BrowserUploadProgress = {
  phase: "starting" | "uploading" | "completing" | "done" | "cancelled" | "error";
  message: string;
  /** 0–1 */
  ratio: number;
  bytesSent: number;
  bytesTotal: number;
};

export type R2BrowserUploadResult = {
  objectKey: string;
  uploadId: string;
  byteSize: number;
  mimeType: string;
  fileName: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function putPartWithRetry(
  url: string,
  blob: Blob,
  signal: AbortSignal | undefined,
  retries = 3,
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const res = await fetch(url, {
        method: "PUT",
        body: blob,
        signal,
      });
      if (!res.ok) {
        throw new Error(`Part upload failed (${res.status}).`);
      }
      const etag = res.headers.get("ETag") || res.headers.get("etag");
      if (!etag) {
        throw new Error("R2 did not return an ETag for an uploaded part.");
      }
      return etag;
    } catch (e) {
      lastErr = e;
      if (signal?.aborted) throw e;
      if (attempt < retries - 1) await sleep(400 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Part upload failed.");
}

/**
 * Upload a large video via Phase 1 R2 multipart APIs.
 * Does not insert story_media — caller does that after success.
 */
export async function uploadLargeVideoToR2(args: {
  storyId: string;
  file: File;
  onProgress?: (p: R2BrowserUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<R2BrowserUploadResult> {
  const { storyId, file, onProgress, signal } = args;
  const mimeType = file.type || "video/mp4";
  const bytesTotal = file.size;

  onProgress?.({
    phase: "starting",
    message: "Starting large video upload…",
    ratio: 0,
    bytesSent: 0,
    bytesTotal,
  });

  const createRes = await fetch("/api/r2/upload/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storyId,
      fileName: file.name,
      mimeType,
      byteSize: file.size,
    }),
    signal,
  });

  const createJson = (await createRes.json()) as {
    error?: string;
    code?: string;
    objectKey?: string;
    uploadId?: string;
    partSize?: number;
    parts?: Array<{ partNumber: number; url: string }>;
  };

  if (!createRes.ok) {
    if (createJson.code === "R2_NOT_CONFIGURED") {
      throw new Error(
        "Large video upload isn’t configured yet (Cloudflare R2). Videos under 50 MB still work.",
      );
    }
    throw new Error(createJson.error || "Could not start large video upload.");
  }

  const objectKey = createJson.objectKey!;
  const uploadId = createJson.uploadId!;
  const partSize = createJson.partSize!;
  const parts = createJson.parts ?? [];

  const abortRemote = async () => {
    try {
      await fetch("/api/r2/upload/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey, uploadId }),
      });
    } catch {
      /* ignore */
    }
  };

  if (signal) {
    const onAbort = () => {
      void abortRemote();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  }

  const completed: Array<{ partNumber: number; etag: string }> = [];
  let bytesSent = 0;

  try {
    for (const part of parts) {
      if (signal?.aborted) {
        await abortRemote();
        onProgress?.({
          phase: "cancelled",
          message: "Upload cancelled.",
          ratio: bytesSent / bytesTotal,
          bytesSent,
          bytesTotal,
        });
        throw new DOMException("Aborted", "AbortError");
      }

      const start = (part.partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);

      onProgress?.({
        phase: "uploading",
        message: `Uploading video… part ${part.partNumber} of ${parts.length}`,
        ratio: bytesSent / bytesTotal,
        bytesSent,
        bytesTotal,
      });

      const etag = await putPartWithRetry(part.url, blob, signal);
      completed.push({ partNumber: part.partNumber, etag });
      bytesSent = end;

      onProgress?.({
        phase: "uploading",
        message: `Uploading video… ${Math.min(100, Math.round((bytesSent / bytesTotal) * 100))}%`,
        ratio: bytesSent / bytesTotal,
        bytesSent,
        bytesTotal,
      });
    }

    onProgress?.({
      phase: "completing",
      message: "Finishing video upload…",
      ratio: 0.99,
      bytesSent,
      bytesTotal,
    });

    const completeRes = await fetch("/api/r2/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectKey, uploadId, parts: completed }),
      signal,
    });
    const completeJson = (await completeRes.json()) as { error?: string };
    if (!completeRes.ok) {
      await abortRemote();
      throw new Error(completeJson.error || "Could not finish large video upload.");
    }

    onProgress?.({
      phase: "done",
      message: "Video uploaded.",
      ratio: 1,
      bytesSent: bytesTotal,
      bytesTotal,
    });

    return {
      objectKey,
      uploadId,
      byteSize: file.size,
      mimeType,
      fileName: file.name,
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw e;
    }
    await abortRemote();
    throw e;
  }
}
