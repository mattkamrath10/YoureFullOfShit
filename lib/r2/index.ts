import "server-only";

export {
  R2_ENV,
  getR2Config,
  isR2Configured,
  assertAllowedVideoMime,
  R2_ALLOWED_VIDEO_MIME,
  type R2Config,
} from "@/lib/r2/config";
export { getR2Client } from "@/lib/r2/client";
export { buildR2VideoObjectKey, r2PublicObjectUrl } from "@/lib/r2/keys";
export {
  R2_MULTIPART_PART_SIZE,
  createR2MultipartVideoUpload,
  completeR2MultipartVideoUpload,
  abortR2MultipartVideoUpload,
  type CreateR2MultipartUploadInput,
  type CreateR2MultipartUploadResult,
} from "@/lib/r2/upload";

export { requireAuthUser, assertUserOwnsStory } from "@/lib/r2/auth";

export { getR2PlaybackUrl, getR2PublicBase } from "@/lib/r2/playback";
