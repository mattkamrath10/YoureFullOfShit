"use client";

import { createClient } from "@/lib/supabase/client";
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

/** Supabase Free object cap — videos larger than this go to R2. */
export const SUPABASE_VIDEO_MAX = 50 * 1024 * 1024;
/** App max for R2 videos (matches Phase 1 default 1 GiB). */
export const R2_VIDEO_APP_MAX = 1024 * 1024 * 1024;

export const LIMITS = {
  image: 10 * 1024 * 1024,
  /** Selection/validation ceiling for videos (R2 path). */
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

export function validateMediaFile(
  file: File,
): { ok: true; mediaType: MediaType } | { ok: false; error: string } {
  const mediaType = detectMediaType(file);
  if (!mediaType) {
    return {
      ok: false,
      error: `${file.name}: unsupported type. Use JPG/PNG/WEBP, MP4/MOV/WEBM, or PDF.`,
    };
  }
  const limit =
    mediaType === "image"
      ? LIMITS.image
      : mediaType === "video"
        ? LIMITS.video
        : LIMITS.document;
  if (file.size > limit) {
    if (mediaType === "video") {
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
 * videos over 50 MB → Cloudflare R2 multipart (one object, no FFmpeg).
 */
export async function uploadStoryMedia(args: {
  userId: string;
  storyId: string;
  files: SelectedMedia[];
  onProgress?: (p: MediaUploadProgress) => void;
  signal?: AbortSignal;
}) {
  const supabase = createClient();
  const total = args.files.length;
  let done = 0;

  for (const item of args.files) {
    if (args.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    args.onProgress?.({
      kind: shouldUseR2ForVideo(item.file) ? "r2" : "file",
      done,
      total,
      currentName: item.file.name,
      ratio: 0,
      message: shouldUseR2ForVideo(item.file)
        ? "Uploading large video to secure storage…"
        : `Uploading ${item.file.name}…`,
    });

    if (shouldUseR2ForVideo(item.file)) {
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
