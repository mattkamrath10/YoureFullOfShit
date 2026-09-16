"use client";

import { createClient } from "@/lib/supabase/client";
import { isEmailAuthUser } from "@/lib/auth/session";
import { plusErrorMessage } from "@/lib/plus/errors";
import {
  GUEST_LARGE_VIDEO_MESSAGE,
  GUEST_UPLOAD_MAX,
  uploadStoryMedia,
  validateMediaFile,
  type MediaUploadProgress,
  type SelectedMedia,
} from "@/lib/media";

export type SubmitStoryInput = {
  title: string;
  categoryId: string;
  body: string;
  isAnonymous: boolean;
  displayName?: string;
  media: SelectedMedia[];
  onUploadProgress?: (p: MediaUploadProgress) => void;
  signal?: AbortSignal;
};

function makePreview(body: string, title: string): string {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (cleaned) {
    if (cleaned.length <= 160) return cleaned;
    return `${cleaned.slice(0, 157).trim()}...`;
  }
  const t = title.trim();
  return t.length <= 160 ? t : `${t.slice(0, 157).trim()}...`;
}

function notifyAdminsNewStory(storyId: string): void {
  void fetch("/api/admin/notify-new-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId }),
    keepalive: true,
  }).catch((err) => {
    console.error("[submit] admin notify request failed", err);
  });
}

export async function submitStory(input: SubmitStoryInput) {
  const title = input.title.trim();
  const body = input.body.trim();
  const categoryId = input.categoryId.trim();
  const hasMedia = input.media.length > 0;

  if (!title) throw new Error("Title is required.");
  if (title.length > 120) throw new Error("Title must be 120 characters or fewer.");
  if (!categoryId) throw new Error("Category is required.");
  if (!body && !hasMedia) {
    throw new Error("Add a story (type or speak) or attach a video/photo/document.");
  }
  if (body.length > 20000) throw new Error("Story must be 20,000 characters or fewer.");

  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const sessionUser = authData.user;
  if (!sessionUser || !isEmailAuthUser(sessionUser)) {
    throw new Error("Create an account to tell your story.");
  }
  const user = sessionUser;

  for (const item of input.media) {
    const check = validateMediaFile(item.file, { emailAuth: true });
    if (!check.ok) throw new Error(check.error);
    if (item.file.size > GUEST_UPLOAD_MAX && item.mediaType !== "video") {
      throw new Error(GUEST_LARGE_VIDEO_MESSAGE);
    }
  }

  if (!input.isAnonymous) {
    const name = (input.displayName ?? "").trim();
    if (!name) throw new Error("Enter a display name, or choose Post anonymously.");
    if (name.length > 60) throw new Error("Display name must be 60 characters or fewer.");
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", user.id);
    if (profileError) throw profileError;
  }

  const { data, error } = await supabase.rpc("create_pending_story", {
    p_category_id: categoryId,
    p_title: title,
    p_body: body,
    p_preview: makePreview(body, title),
    p_is_anonymous: input.isAnonymous,
  });

  if (error) {
    const mapped = plusErrorMessage(error);
    throw new Error(mapped?.message ?? error.message);
  }

  const storyId = data as string;
  if (!storyId) throw new Error("Could not create story.");

  if (input.media.length > 0) {
    await uploadStoryMedia({
      userId: user.id,
      storyId,
      files: input.media,
      onProgress: input.onUploadProgress,
      signal: input.signal,
    });
  }

  notifyAdminsNewStory(storyId);
  return storyId;
}
