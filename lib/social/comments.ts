"use client";

import { createClient } from "@/lib/supabase/client";
import { getOptionalEmailUser, requireEmailUser } from "@/lib/social/auth";
import { asError } from "@/lib/social/errors";
import type { Profile, StoryComment, StoryCommentStatus } from "@/types/database";

const COMMENT_SELECT =
  "id, story_id, user_id, body, status, created_at, updated_at, profiles(id, display_name, avatar_url, username)";

type ProfileSnippet = Pick<
  Profile,
  "id" | "display_name" | "avatar_url" | "username"
>;

function normalizeProfile(
  profiles: ProfileSnippet | ProfileSnippet[] | null | undefined,
): ProfileSnippet | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

function mapComment(row: Record<string, unknown>): StoryComment {
  return {
    id: row.id as string,
    story_id: row.story_id as string,
    user_id: row.user_id as string,
    body: row.body as string,
    status: row.status as StoryCommentStatus,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    profiles: normalizeProfile(
      row.profiles as ProfileSnippet | ProfileSnippet[] | null | undefined,
    ),
  };
}

export async function listComments(storyId: string): Promise<StoryComment[]> {
  const supabase = createClient();
  // Avoid profiles embed if grants are broken — fall back to bare rows.
  const withProfiles = await supabase
    .from("story_comments")
    .select(COMMENT_SELECT)
    .eq("story_id", storyId)
    .eq("status", "visible")
    .order("created_at", { ascending: true });

  if (!withProfiles.error) {
    return (withProfiles.data ?? []).map((row) =>
      mapComment(row as Record<string, unknown>),
    );
  }

  const bare = await supabase
    .from("story_comments")
    .select("id, story_id, user_id, body, status, created_at, updated_at")
    .eq("story_id", storyId)
    .eq("status", "visible")
    .order("created_at", { ascending: true });

  if (bare.error) throw asError(bare.error, "Could not load comments.");
  return (bare.data ?? []).map((row) =>
    mapComment(row as Record<string, unknown>),
  );
}

export async function addComment(
  storyId: string,
  body: string,
): Promise<StoryComment> {
  const user = await requireEmailUser();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");
  if (trimmed.length > 2000) throw new Error("Comment is too long (max 2000).");

  const supabase = createClient();
  // Insert ONLY into story_comments — never touch public.profiles from the browser.
  const { data: inserted, error: insertError } = await supabase
    .from("story_comments")
    .insert({
      story_id: storyId,
      user_id: user.id,
      body: trimmed,
      status: "visible" satisfies StoryCommentStatus,
    })
    .select("id, story_id, user_id, body, status, created_at, updated_at")
    .single();

  if (insertError) throw asError(insertError, "Could not post comment.");

  const { data: withProfile } = await supabase
    .from("story_comments")
    .select(COMMENT_SELECT)
    .eq("id", inserted.id)
    .maybeSingle();

  if (withProfile) {
    return mapComment(withProfile as Record<string, unknown>);
  }

  return mapComment(inserted as Record<string, unknown>);
}

export async function deleteOwnComment(commentId: string): Promise<void> {
  const user = await requireEmailUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("story_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) throw asError(error, "Could not delete comment.");
}

export async function reportComment(
  commentId: string,
  reason?: string,
): Promise<void> {
  const user = await requireEmailUser();
  const supabase = createClient();
  const { error } = await supabase.from("story_comment_reports").insert({
    comment_id: commentId,
    reporter_id: user.id,
    reason: reason?.trim() || null,
  });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error("You already reported this comment.");
    }
    throw asError(error, "Could not report comment.");
  }
}

export async function countVisibleComments(storyId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("story_comments")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .eq("status", "visible");
  if (error) throw asError(error, "Could not count comments.");
  return count ?? 0;
}

export async function getMyUserId(): Promise<string | null> {
  const user = await getOptionalEmailUser();
  return user?.id ?? null;
}
