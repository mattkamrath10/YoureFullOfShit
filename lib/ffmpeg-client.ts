"use client";

/**
 * Single client-side FFmpeg loader for Last Storyteller.
 * Static package imports so Turbopack can resolve modules.
 * WASM core still loaded via toBlobURL (single-thread, no COOP/COEP).
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export { fetchFile };

export type YfosFFmpeg = FFmpeg;

let shared: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export function terminateFFmpeg() {
  try {
    shared?.terminate();
  } catch {
    /* ignore */
  }
  shared = null;
  loading = null;
}

export async function loadFFmpeg(onStatus?: (message: string) => void): Promise<FFmpeg> {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg can only load in the browser.");
  }
  if (shared) return shared;
  if (loading) return loading;

  loading = (async () => {
    onStatus?.("Loading video tools on this device…");
    const ffmpeg = new FFmpeg();
    // Single-threaded core — avoids SharedArrayBuffer / COOP-COEP
    const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });
    shared = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loading;
  } catch (e) {
    loading = null;
    shared = null;
    throw e;
  } finally {
    loading = null;
  }
}
