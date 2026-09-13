"use client";

import { createClient } from "@/lib/supabase/client";
import { getOptionalEmailUser, requireEmailUser } from "@/lib/social/auth";
import { asError } from "@/lib/social/errors";

export type FollowState = {
  following: boolean;
  followerCount: number;
};

export async function getFollowState(authorId: string): Promise<FollowState> {
  const supabase = createClient();

  const { count, error: countError } = await supabase
    .from("user_follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", authorId);

  if (countError) throw asError(countError, "Could not load follows.");

  const user = await getOptionalEmailUser();
  let following = false;
  if (user && user.id !== authorId) {
    const { data, error } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", authorId)
      .maybeSingle();
    if (error) throw asError(error, "Could not load follow state.");
    following = Boolean(data);
  }

  return { following, followerCount: count ?? 0 };
}

/** Toggle follow. Requires email auth. Cannot follow self. */
export async function toggleFollow(authorId: string): Promise<FollowState> {
  const user = await requireEmailUser();
  if (user.id === authorId) {
    throw new Error("You cannot follow yourself.");
  }

  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", authorId)
    .maybeSingle();

  if (existingError) throw asError(existingError, "Could not check follow.");

  if (existing) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("id", existing.id);
    if (error) throw asError(error, "Could not unfollow.");
  } else {
    const { error } = await supabase.from("user_follows").insert({
      follower_id: user.id,
      following_id: authorId,
    });
    if (error) throw asError(error, "Could not follow.");
  }

  return getFollowState(authorId);
}
