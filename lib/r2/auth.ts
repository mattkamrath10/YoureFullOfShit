import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isEmailAuthUser } from "@/lib/auth/session";

/**
 * Resolve an email (free account) user for R2 upload APIs.
 * Anonymous / guest sessions are rejected — R2 is email-only.
 */
export async function requireAuthUser(): Promise<{ id: string; user: User }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isEmailAuthUser(data.user)) {
    throw new Response(
      JSON.stringify({
        error: "Create an account to tell your story. Large-video uploads require Last Storyteller Plus.",
        code: "EMAIL_ACCOUNT_REQUIRED",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  return { id: data.user.id, user: data.user };
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
