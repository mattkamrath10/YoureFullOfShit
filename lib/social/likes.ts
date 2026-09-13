"use client";

import { createClient } from "@/lib/supabase/client";
import { getOptionalEmailUser, requireEmailUser } from "@/lib/social/auth";
import { asError } from "@/lib/social/errors";

export type LikeState = {
  liked: boolean;
  count: number;
};

export async function getLikeState(storyId: string): Promise<LikeState> {
  const supabase = createClient();

  const { count, error: countError } = await supabase
    .from("story_likes")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId);

  if (countError) throw asError(countError, "Could not load likes.");

  const user = await getOptionalEmailUser();
  let liked = false;
  if (user) {
    const { data, error } = await supabase
      .from("story_likes")
      .select("id")
      .eq("story_id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw asError(error, "Could not load like state.");
    liked = Boolean(data);
  }

  return { liked, count: count ?? 0 };
}

/** Toggle like. Returns the next state. Requires email auth. */
export async function toggleLike(storyId: string): Promise<LikeState> {
  const user = await requireEmailUser();
  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from("story_likes")
    .select("id")
    .eq("story_id", storyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw asError(existingError, "Could not check like.");

  if (existing) {
    const { error } = await supabase
      .from("story_likes")
      .delete()
      .eq("id", existing.id);
    if (error) throw asError(error, "Could not unlike.");
  } else {
    const { error } = await supabase.from("story_likes").insert({
      story_id: storyId,
      user_id: user.id,
    });
    if (error) throw asError(error, "Could not like.");
  }

  return getLikeState(storyId);
}
