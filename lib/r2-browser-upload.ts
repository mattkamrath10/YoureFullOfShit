"use client";

/** Browser multipart uploader for Last Storyteller → Cloudflare R2 (no secrets in client). */

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

class NonRetryablePartUploadError extends Error {}

async function readApiJson(
  path: string,
  init: RequestInit,
  stage: "preparation" | "completion",
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new Error(
      `R2 upload ${stage} failed because the app could not be reached. Check the production deployment and try again.`,
    );
  }

  const raw = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    // A proxy/server failure can return HTML instead of the API's JSON response.
  }

  if (!response.ok) {
    const detail =
      typeof body.error === "string" ? body.error : `Request returned ${response.status}.`;
    throw new Error(`R2 upload ${stage} failed: ${detail}`);
  }

  return body;
}

async function putPartWithRetry(
  url: string,
  blob: Blob,
  signal: AbortSignal | undefined,
  partNumber: number,
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
        const error = new Error(`R2 returned HTTP ${res.status}.`);
        if (res.status !== 408 && res.status !== 429 && res.status < 500) {
          throw new NonRetryablePartUploadError(error.message);
        }
        throw error;
      }
      const etag = res.headers.get("ETag") || res.headers.get("etag");
      if (!etag) {
        throw new NonRetryablePartUploadError(
          "R2 did not expose an ETag response header. Confirm the bucket CORS policy exposes ETag.",
        );
      }
      return etag;
    } catch (e) {
      lastErr = e;
      if (signal?.aborted) throw e;
      if (e instanceof NonRetryablePartUploadError) throw e;
      if (attempt < retries - 1) await sleep(400 * (attempt + 1));
    }
  }
  const detail =
    lastErr instanceof Error ? lastErr.message : "The browser could not reach R2.";
  throw new Error(
    `R2 upload failed on part ${partNumber} after ${retries} attempts: ${detail} Check the R2 CORS policy allows this site and PUT requests.`,
  );
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

  const createJson = (await readApiJson(
    "/api/r2/upload/create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storyId,
        fileName: file.name,
        mimeType,
        byteSize: file.size,
      }),
      signal,
    },
    "preparation",
  )) as {
    error?: string;
    code?: string;
    objectKey?: string;
    uploadId?: string;
    partSize?: number;
    parts?: Array<{ partNumber: number; url: string }>;
  };

  if (!createJson.objectKey || !createJson.uploadId || !createJson.partSize) {
    throw new Error(
      "R2 upload preparation failed: the server returned incomplete multipart upload details.",
    );
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

      const etag = await putPartWithRetry(
        part.url,
        blob,
        signal,
        part.partNumber,
      );
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

    await readApiJson(
      "/api/r2/upload/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey, uploadId, parts: completed }),
        signal,
      },
      "completion",
    );

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
