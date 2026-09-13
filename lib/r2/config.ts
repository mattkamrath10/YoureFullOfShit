import "server-only";

/**
 * Server-only R2 configuration for YFOS.
 * Never import this module from Client Components.
 */

export const R2_ENV = {
  accountId: "R2_ACCOUNT_ID",
  accessKeyId: "R2_ACCESS_KEY_ID",
  secretAccessKey: "R2_SECRET_ACCESS_KEY",
  bucketName: "R2_BUCKET_NAME",
  publicUrl: "R2_PUBLIC_URL",
  /** Optional override; default is https://{accountId}.r2.cloudflarestorage.com */
  endpoint: "R2_ENDPOINT",
  /** App-level max video object size (bytes). Default 1 GiB. */
  maxVideoBytes: "R2_MAX_VIDEO_BYTES",
} as const;

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  /** Base URL for eventual playback, e.g. https://media.example.com (no trailing slash) */
  publicUrl: string | null;
  endpoint: string;
  maxVideoBytes: number;
};

const DEFAULT_MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GiB

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.",
    );
  }

  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  const maxRaw = process.env.R2_MAX_VIDEO_BYTES?.trim();
  const maxVideoBytes = maxRaw ? Number(maxRaw) : DEFAULT_MAX_VIDEO_BYTES;
  if (!Number.isFinite(maxVideoBytes) || maxVideoBytes < 50 * 1024 * 1024) {
    throw new Error("R2_MAX_VIDEO_BYTES must be a number >= 52428800 (50 MB).");
  }

  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "") || null;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    endpoint,
    maxVideoBytes,
  };
}

/** Allowed video MIME types for future R2 uploads (Phase 2). */
export const R2_ALLOWED_VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function assertAllowedVideoMime(mime: string): void {
  const normalized = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!R2_ALLOWED_VIDEO_MIME.has(normalized)) {
    throw new Error(
      `Unsupported video type "${mime}". Allowed: MP4, WEBM, MOV (QuickTime).`,
    );
  }
}
