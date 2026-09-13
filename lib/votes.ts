"use client";

import { createClient } from "@/lib/supabase/client";
import { isAnonymousAuthUser } from "@/lib/auth/session";
import type { Verdict } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export { isAnonymousAuthUser };

/**
 * Ensure there is a Supabase session for voting / submit.
 *
 * - If an email (or any) user is already signed in, reuse that session.
 * - Never call signInAnonymously while a real email user is present
 *   (would replace their session).
 * - When signed out, create an anonymous session for guest vote/submit.
 *
 * Story "Post anonymously" is independent of this auth anonymity flag.
 */
export async function ensureUser(): Promise<User> {
  const supabase = createClient();
  const { data: existing } = await supabase.auth.getUser();
  if (existing.user) return existing.user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error("Anonymous sign-in failed");
  return data.user;
}

export async function castVote(storyId: string, verdict: Verdict) {
  const supabase = createClient();
  const user = await ensureUser();

  const { error } = await supabase.from("story_votes").upsert(
    {
      story_id: storyId,
      user_id: user.id,
      verdict,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "story_id,user_id" },
  );

  if (error) throw error;
}

export async function getMyVote(storyId: string): Promise<Verdict | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("story_votes")
    .select("verdict")
    .eq("story_id", storyId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) throw error;
  return (data?.verdict as Verdict | undefined) ?? null;
}
