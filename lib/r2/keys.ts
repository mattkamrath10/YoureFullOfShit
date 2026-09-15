import "server-only";

import { randomUUID } from "crypto";

/**
 * Object key design for Last Storyteller R2 videos.
 *
 * stories/{storyId}/{ownerId}/{uuid}/{safeFileName}
 *
 * - storyId ties object to a story for cleanup
 * - ownerId supports ownership checks / listing
 * - uuid prevents collisions and guessing
 * - safeFileName keeps a human hint without trusting raw input alone
 */
export function buildR2VideoObjectKey(args: {
  storyId: string;
  ownerId: string;
  originalFileName: string;
}): string {
  const storyId = sanitizeId(args.storyId);
  const ownerId = sanitizeId(args.ownerId);
  const uuid = randomUUID();
  const safe = safeFileName(args.originalFileName);
  return `stories/${storyId}/${ownerId}/${uuid}/${safe}`;
}

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleaned || cleaned.length < 8) {
    throw new Error("Invalid id for R2 object key.");
  }
  return cleaned;
}

function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "video.mp4";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  const trimmed = cleaned.slice(0, 80) || "video.mp4";
  if (!/\.(mp4|webm|mov)$/i.test(trimmed)) {
    return `${trimmed}.mp4`;
  }
  return trimmed;
}

/** Playback URL helper for Phase 2+ (public base or path-only). */
export function r2PublicObjectUrl(publicBase: string | null, objectKey: string): string | null {
  if (!publicBase) return null;
  return `${publicBase.replace(/\/$/, "")}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}
