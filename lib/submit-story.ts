"use client";

import { createClient } from "@/lib/supabase/client";
import { ensureUser } from "@/lib/votes";
import {
  uploadStoryMedia,
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

  const user = await ensureUser();
  const supabase = createClient();

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

  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: user.id,
      category_id: categoryId,
      title,
      body,
      preview: makePreview(body, title),
      is_demo: false,
      is_published: false,
      status: "pending",
      is_anonymous: input.isAnonymous,
    })
    .select("id")
    .single();

  if (error) throw error;
  const storyId = data.id as string;

  if (input.media.length > 0) {
    await uploadStoryMedia({
      userId: user.id,
      storyId,
      files: input.media,
      onProgress: input.onUploadProgress,
      signal: input.signal,
    });
  }

  return storyId;
}
