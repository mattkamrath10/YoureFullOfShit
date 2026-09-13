"use client";

import { createClient } from "@/lib/supabase/client";
import { isEmailAuthUser } from "@/lib/auth/session";
import type { MediaType } from "@/types/database";
import {
  uploadLargeVideoToR2,
  type R2BrowserUploadProgress,
} from "@/lib/r2-browser-upload";

export type SelectedMedia = {
  id: string;
  file: File;
  mediaType: MediaType;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DOC_TYPES = new Set(["application/pdf"]);

/** Supabase Free object cap — videos larger than this go to R2 (email only). */
export const SUPABASE_VIDEO_MAX = 50 * 1024 * 1024;
/** Hard ceiling for guest / anonymous uploads (Supabase path only). */
export const GUEST_UPLOAD_MAX = 50 * 1024 * 1024;
/** App max for R2 videos (matches Phase 1 default 1 GiB). */
export const R2_VIDEO_APP_MAX = 1024 * 1024 * 1024;

export const GUEST_LARGE_VIDEO_MESSAGE =
  "Guests can attach video up to 50 MB. Create a free account for larger videos (up to 1 GB).";

export const LIMITS = {
  image: 10 * 1024 * 1024,
  /** Selection/validation ceiling for videos (R2 path for email accounts). */
  video: R2_VIDEO_APP_MAX,
  document: 20 * 1024 * 1024,
} as const;

export function detectMediaType(file: File): MediaType | null {
  if (IMAGE_TYPES.has(file.type)) return "image";
  if (VIDEO_TYPES.has(file.type)) return "video";
  if (DOC_TYPES.has(file.type)) return "document";
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp")) {
    return "image";
  }
  if (name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov")) {
    return "video";
  }
  if (name.endsWith(".pdf")) return "document";
  return null;
}

export function shouldUseR2ForVideo(file: File): boolean {
  return detectMediaType(file) === "video" && file.size > SUPABASE_VIDEO_MAX;
}

export type ValidateMediaOptions = {
  /** True when the session is a real email free account (not guest/anonymous). */
  emailAuth?: boolean;
};

export function validateMediaFile(
  file: File,
  opts?: ValidateMediaOptions,
): { ok: true; mediaType: MediaType } | { ok: false; error: string } {
  const emailAuth = Boolean(opts?.emailAuth);
  const mediaType = detectMediaType(file);
  if (!mediaType) {
    return {
      ok: false,
      error: `${file.name}: unsupported type. Use JPG/PNG/WEBP, MP4/MOV/WEBM, or PDF.`,
    };
  }

  if (!emailAuth && file.size > GUEST_UPLOAD_MAX) {
    if (mediaType === "video") {
      return { ok: false, error: GUEST_LARGE_VIDEO_MESSAGE };
    }
    return {
      ok: false,
      error: `${file.name}: guests can upload files up to 50 MB. Create a free account for larger uploads.`,
    };
  }

  const limit =
    mediaType === "image"
      ? LIMITS.image
      : mediaType === "video"
        ? emailAuth
          ? LIMITS.video
          : SUPABASE_VIDEO_MAX
        : LIMITS.document;

  if (file.size > limit) {
    if (mediaType === "video") {
      if (!emailAuth) {
        return { ok: false, error: GUEST_LARGE_VIDEO_MESSAGE };
      }
      return {
        ok: false,
        error:
          "Video is too large. Maximum size is 1 GB. Please choose a shorter clip.",
      };
    }
    const mb = Math.round(limit / (1024 * 1024));
    return { ok: false, error: `${file.name}: too large. Max ${mb} MB for ${mediaType}s.` };
  }
  return { ok: true, mediaType };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  const trimmed = cleaned.slice(0, 80) || "file";
  return `${Date.now()}-${trimmed}`;
}

export type MediaUploadProgress = {
  kind: "file" | "r2";
  done: number;
  total: number;
  currentName: string;
  /** 0–1 for active R2 file */
  ratio?: number;
  message?: string;
};

/**
 * Upload story media: images/PDFs/small videos → Supabase Storage;
 * videos over 50 MB → Cloudflare R2 multipart (email accounts only).
 * Guests / anonymous: Supabase only; reject byte_size > 50 MB.
 */
export async function uploadStoryMedia(args: {
  userId: string;
  storyId: string;
  files: SelectedMedia[];
  onProgress?: (p: MediaUploadProgress) => void;
  signal?: AbortSignal;
}) {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const emailAuth = isEmailAuthUser(authData.user);
  const total = args.files.length;
  let done = 0;

  for (const item of args.files) {
    if (args.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    if (!emailAuth && item.file.size > GUEST_UPLOAD_MAX) {
      throw new Error(
        item.mediaType === "video" || detectMediaType(item.file) === "video"
          ? GUEST_LARGE_VIDEO_MESSAGE
          : `${item.file.name}: guests can upload files up to 50 MB.`,
      );
    }

    const useR2 = emailAuth && shouldUseR2ForVideo(item.file);
    if (!emailAuth && shouldUseR2ForVideo(item.file)) {
      throw new Error(GUEST_LARGE_VIDEO_MESSAGE);
    }

    args.onProgress?.({
      kind: useR2 ? "r2" : "file",
      done,
      total,
      currentName: item.file.name,
      ratio: 0,
      message: useR2
        ? "Uploading large video to secure storage…"
        : `Uploading ${item.file.name}…`,
    });

    if (useR2) {
      const r2 = await uploadLargeVideoToR2({
        storyId: args.storyId,
        file: item.file,
        signal: args.signal,
        onProgress: (p: R2BrowserUploadProgress) => {
          args.onProgress?.({
            kind: "r2",
            done,
            total,
            currentName: item.file.name,
            ratio: p.ratio,
            message: p.message,
          });
        },
      });

      const { error: rowError } = await supabase.from("story_media").insert({
        story_id: args.storyId,
        owner_id: args.userId,
        media_type: "video",
        storage_path: r2.objectKey,
        storage_provider: "r2",
        file_name: r2.fileName,
        mime_type: r2.mimeType,
        byte_size: r2.byteSize,
        sort_order: done,
      });

      if (rowError) {
        throw new Error(
          `Video uploaded but saving media record failed: ${rowError.message}`,
        );
      }
    } else {
      const filename = safeFileName(item.file.name);
      const path = `${args.userId}/${args.storyId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("story-media")
        .upload(path, item.file, {
          contentType: item.file.type || undefined,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw new Error(`Upload failed for ${item.file.name}: ${uploadError.message}`);
      }

      const row: Record<string, unknown> = {
        story_id: args.storyId,
        owner_id: args.userId,
        media_type: item.mediaType,
        storage_path: path,
        storage_provider: "supabase",
        file_name: item.file.name,
        mime_type: item.file.type || null,
        byte_size: item.file.size,
        sort_order: done,
      };

      const { error: rowError } = await supabase.from("story_media").insert(row);
      if (rowError) {
        // Backward compatible if migration not applied yet
        if (/storage_provider/i.test(rowError.message)) {
          delete row.storage_provider;
          const retry = await supabase.from("story_media").insert(row);
          if (retry.error) {
            throw new Error(
              `Saved file but failed media row for ${item.file.name}: ${retry.error.message}`,
            );
          }
        } else {
          throw new Error(
            `Saved file but failed media row for ${item.file.name}: ${rowError.message}`,
          );
        }
      }
    }

    done += 1;
    args.onProgress?.({
      kind: "file",
      done,
      total,
      currentName: item.file.name,
      ratio: 1,
      message: `Uploaded ${done}/${total}`,
    });
  }
}
