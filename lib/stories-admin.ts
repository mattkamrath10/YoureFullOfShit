import { createClient } from "@/lib/supabase/server";
import type { Story } from "@/types/database";

export async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!data?.is_admin) return null;
  return { userId: auth.user.id };
}

/** All non-demo stories for the moderation center (pending / published / rejected). */
export async function getModerationQueue(): Promise<Story[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select(
      "*, categories(*), profiles(*), story_media(id, media_type, mime_type)",
    )
    .in("status", ["pending", "rejected", "published"])
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Story[];
}

export function moderationCounts(stories: Story[]) {
  return {
    pending: stories.filter((s) => s.status === "pending").length,
    approved: stories.filter((s) => s.status === "published").length,
    rejected: stories.filter((s) => s.status === "rejected").length,
    all: stories.length,
  };
}
