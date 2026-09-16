/** A0 product rules. Server enforcement lives in SQL + APIs; this module is the shared spec. */

export const PLUS_PRODUCT_CODE = "lst.plus";
export const PLUS_MONTHLY_PRODUCT_ID = "com.laststoryteller.plus.monthly";
export const PLUS_INTENDED_US_PRICE = "$1.99/month";

export const FREE_STORY_SUBMISSIONS = 2;
export const LARGE_VIDEO_THRESHOLD_BYTES = 50 * 1024 * 1024;
export const PLUS_MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
export const PLUS_MAX_STORAGE_BYTES = 10 * 1024 * 1024 * 1024;
export const PLUS_LARGE_VIDEOS_PER_MONTH = 10;

export const PLUS_FEATURES = [
  "Continue publishing after your first 2 free story submissions",
  "10 large-video uploads per calendar month (UTC, no rollover)",
  "Up to 1 GiB per large video",
  "Up to 10 GiB active stored media",
] as const;

export const FREE_TIER_FEATURES = [
  "Browse, search, read, watch, listen, and share without an account",
  "Free account to comment, like, follow, and report",
  "First 2 lifetime story submissions",
  "Story media up to 50 MB (no large-video / R2 uploads)",
] as const;

export type EntitlementSource = "stripe" | "apple" | "google" | "admin" | "promo";
export type EntitlementStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "expired"
  | "revoked";

export function isLargeVideo(args: {
  mediaType: string;
  byteSize: number;
}): boolean {
  return args.mediaType === "video" && args.byteSize > LARGE_VIDEO_THRESHOLD_BYTES;
}

export function canCreateStory(args: {
  storiesSubmittedCount: number;
  hasPlus: boolean;
}): { ok: true } | { ok: false; code: "plus_required" } {
  if (args.storiesSubmittedCount < FREE_STORY_SUBMISSIONS || args.hasPlus) {
    return { ok: true };
  }
  return { ok: false, code: "plus_required" };
}

export function canUploadLargeVideo(args: {
  hasPlus: boolean;
  byteSize: number;
  largeVideosThisMonth: number;
  storedBytes: number;
  reservedBytes?: number;
}):
  | { ok: true }
  | {
      ok: false;
      code:
        | "plus_required"
        | "video_too_large"
        | "monthly_large_video_limit"
        | "storage_limit";
    } {
  if (!args.hasPlus) return { ok: false, code: "plus_required" };
  if (args.byteSize > PLUS_MAX_VIDEO_BYTES) {
    return { ok: false, code: "video_too_large" };
  }
  if (args.byteSize <= LARGE_VIDEO_THRESHOLD_BYTES) {
    return { ok: false, code: "plus_required" };
  }
  if (args.largeVideosThisMonth >= PLUS_LARGE_VIDEOS_PER_MONTH) {
    return { ok: false, code: "monthly_large_video_limit" };
  }
  const reserved = args.reservedBytes ?? 0;
  if (args.storedBytes + reserved + args.byteSize > PLUS_MAX_STORAGE_BYTES) {
    return { ok: false, code: "storage_limit" };
  }
  return { ok: true };
}

export function canUploadFreeMedia(byteSize: number): boolean {
  return byteSize <= LARGE_VIDEO_THRESHOLD_BYTES;
}

export function entitlementIsCurrentlyPlus(args: {
  status: EntitlementStatus;
  expiresAt: string | Date | null;
  now?: Date;
}): boolean {
  if (args.status === "expired" || args.status === "revoked") return false;
  if (args.status !== "active" && args.status !== "canceled" && args.status !== "past_due") {
    return false;
  }
  if (args.expiresAt == null) return true;
  const exp =
    args.expiresAt instanceof Date ? args.expiresAt : new Date(args.expiresAt);
  const now = args.now ?? new Date();
  return exp.getTime() > now.getTime();
}
