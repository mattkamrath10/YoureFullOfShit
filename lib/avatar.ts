"use client";

import { createClient } from "@/lib/supabase/client";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateAvatarFile(
  file: File,
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED.has(file.type)) {
    return {
      ok: false,
      error: "Use a JPG, PNG, WEBP, or GIF image.",
    };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Image must be 2 MB or smaller." };
  }
  return { ok: true };
}

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

/** Public URL for a storage path in the avatars bucket. */
export function avatarPublicUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Resolve display URL from profiles.avatar_url.
 * Accepts either a storage path (userId/...) or a full http(s) URL.
 */
export function resolveAvatarDisplayUrl(
  avatarUrl: string | null | undefined,
): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return avatarPublicUrl(avatarUrl);
}

export async function uploadAvatar(args: {
  userId: string;
  file: File;
}): Promise<{ path: string; publicUrl: string }> {
  const check = validateAvatarFile(args.file);
  if (!check.ok) throw new Error(check.error);

  const supabase = createClient();
  const ext = extForMime(args.file.type);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${args.userId}/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, args.file, {
      contentType: args.file.type,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Upload failed");
  }

  // Store storage path in profiles.avatar_url; resolve with getPublicUrl for display.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", args.userId);

  if (updateError) {
    throw new Error(updateError.message || "Could not save avatar on profile");
  }

  return { path, publicUrl: avatarPublicUrl(path) };
}

export async function fetchMyAvatarPath(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.avatar_url as string | null | undefined) ?? null;
}
