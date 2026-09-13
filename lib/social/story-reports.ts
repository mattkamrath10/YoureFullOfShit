"use client";

import { createClient } from "@/lib/supabase/client";
import { requireEmailUser } from "@/lib/social/auth";
import { asError } from "@/lib/social/errors";

/** Submit a story report. Requires email auth. One report per user per story. */
export async function reportStory(
  storyId: string,
  reason: string,
): Promise<{ id: string }> {
  const user = await requireEmailUser();
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Please say why you are reporting this story.");
  if (trimmed.length > 2000) {
    throw new Error("Report reason is too long (max 2000 characters).");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("story_reports")
    .insert({
      story_id: storyId,
      reporter_id: user.id,
      reason: trimmed,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (
      error.code === "23505" ||
      msg.includes("duplicate") ||
      msg.includes("unique")
    ) {
      throw new Error("You already reported this story.");
    }
    throw asError(error, "Could not submit report.");
  }

  return { id: data.id as string };
}
