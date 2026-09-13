import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the authenticated Supabase user for R2 upload APIs.
 * Phase 1: used by /api/r2/upload/* only — not wired to /tell.
 */
export async function requireAuthUser(): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { id: data.user.id };
}

export async function assertUserOwnsStory(args: {
  userId: string;
  storyId: string;
}): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, author_id, status")
    .eq("id", args.storyId)
    .maybeSingle();

  if (error) {
    throw new Response(JSON.stringify({ error: "Could not verify story ownership." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!data || data.author_id !== args.userId) {
    throw new Response(JSON.stringify({ error: "Not allowed to upload to this story." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
