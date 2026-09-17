"use client";

import {
  GUEST_LARGE_VIDEO_MESSAGE,
  GUEST_UPLOAD_MAX,
  uploadStoryMedia,
  validateMediaFile,
  type MediaUploadProgress,
  type SelectedMedia,
} from "@/lib/media";
import { STORY_SUBMISSION_ENDPOINT } from "@/lib/plus/usage";

export type SubmitStoryInput = {
  title: string;
  categoryId: string;
  body: string;
  isAnonymous: boolean;
  displayName?: string;
  media: SelectedMedia[];
  hasPlus?: boolean;
  onUploadProgress?: (p: MediaUploadProgress) => void;
  signal?: AbortSignal;
};

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

  for (const item of input.media) {
    const check = validateMediaFile(item.file, {
      // Client-side UX only. The authenticated story and R2 API routes make
      // the authoritative account/Plus decisions on the server.
      emailAuth: true,
      hasPlus: Boolean(input.hasPlus),
    });
    if (!check.ok) throw new Error(check.error);
    if (item.file.size > GUEST_UPLOAD_MAX && item.mediaType !== "video") {
      throw new Error(GUEST_LARGE_VIDEO_MESSAGE);
    }
  }

  // Use the same cookie-authenticated server path as /api/me/plus. Previously
  // this called Supabase directly from the browser while the nav used a Next
  // API route, allowing their authenticated session snapshots to diverge.
  const response = await fetch(STORY_SUBMISSION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      title,
      categoryId,
      text: body,
      isAnonymous: input.isAnonymous,
      displayName: input.displayName,
    }),
    signal: input.signal,
  });
  const result = (await response.json().catch(() => null)) as
    | {
        data?: { id?: unknown; userId?: unknown };
        error?: { message?: unknown };
      }
    | null;
  if (!response.ok) {
    const message =
      typeof result?.error?.message === "string"
        ? result.error.message
        : "Could not create story.";
    throw new Error(message);
  }

  const storyId =
    typeof result?.data?.id === "string" ? result.data.id : "";
  const userId =
    typeof result?.data?.userId === "string" ? result.data.userId : "";
  if (!storyId || !userId) throw new Error("Could not create story.");

  if (input.media.length > 0) {
    await uploadStoryMedia({
      userId,
      storyId,
      files: input.media,
      onProgress: input.onUploadProgress,
      signal: input.signal,
    });
  }

  notifyAdminsNewStory(storyId);
  return storyId;
}
