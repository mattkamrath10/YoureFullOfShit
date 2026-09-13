"use client";

import { createClient } from "@/lib/supabase/client";
import { ensureUser } from "@/lib/votes";
import type { Profile, StoryComment, StoryCommentStatus } from "@/types/database";

const ADMIN_COMMENT_SELECT = `
  id, story_id, user_id, body, status, created_at, updated_at,
  profiles(id, display_name, avatar_url, username),
  story_comment_reports(id, reason, created_at, reporter_id)
`;

type ProfileSnippet = Pick<
  Profile,
  "id" | "display_name" | "avatar_url" | "username"
>;

export type AdminComment = StoryComment & {
  story_comment_reports?: {
    id: string;
    reason: string | null;
    created_at: string;
    reporter_id: string;
  }[];
  stories?: { id: string; title: string } | null;
};

function normalizeProfile(
  profiles: ProfileSnippet | ProfileSnippet[] | null | undefined,
): ProfileSnippet | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

function normalizeStory(
  stories:
    | { id: string; title: string }
    | { id: string; title: string }[]
    | null
    | undefined,
): { id: string; title: string } | null {
  if (!stories) return null;
  return Array.isArray(stories) ? (stories[0] ?? null) : stories;
}

function mapAdminComment(row: Record<string, unknown>): AdminComment {
  const reports = row.story_comment_reports;
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
    story_comment_reports: Array.isArray(reports)
      ? (reports as AdminComment["story_comment_reports"])
      : [],
    stories: normalizeStory(
      row.stories as
        | { id: string; title: string }
        | { id: string; title: string }[]
        | null
        | undefined,
    ),
  };
}

async function assertAdmin() {
  const user = await ensureUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.is_admin) throw new Error("Admin only.");
  return { user, supabase };
}

/** Comments that are reported, pending, or removed — for moderation. */
export async function listModerationComments(): Promise<AdminComment[]> {
  const { supabase } = await assertAdmin();

  const { data: reports, error: reportError } = await supabase
    .from("story_comment_reports")
    .select("comment_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (reportError) throw reportError;

  const reportedIds = Array.from(
    new Set((reports ?? []).map((r) => r.comment_id as string)),
  );

  const { data: flagged, error: flaggedError } = await supabase
    .from("story_comments")
    .select(`${ADMIN_COMMENT_SELECT}, stories(id, title)`)
    .in("status", ["pending", "removed"])
    .order("updated_at", { ascending: false })
    .limit(200);

  if (flaggedError) throw flaggedError;

  let reportedRows: AdminComment[] = [];
  if (reportedIds.length > 0) {
    const { data, error } = await supabase
      .from("story_comments")
      .select(`${ADMIN_COMMENT_SELECT}, stories(id, title)`)
      .in("id", reportedIds)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    reportedRows = (data ?? []).map((row) =>
      mapAdminComment(row as Record<string, unknown>),
    );
  }

  const map = new Map<string, AdminComment>();
  for (const row of [
    ...reportedRows,
    ...(flagged ?? []).map((row) =>
      mapAdminComment(row as Record<string, unknown>),
    ),
  ]) {
    map.set(row.id, row);
  }

  return Array.from(map.values()).sort((a, b) =>
    (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at),
  );
}

export async function setCommentStatus(
  commentId: string,
  status: StoryCommentStatus,
): Promise<void> {
  const { supabase } = await assertAdmin();
  const { error } = await supabase
    .from("story_comments")
    .update({ status })
    .eq("id", commentId);
  if (error) throw error;
}
