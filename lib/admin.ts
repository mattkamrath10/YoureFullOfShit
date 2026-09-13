"use client";

import { createClient } from "@/lib/supabase/client";
import { ensureUser } from "@/lib/votes";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await ensureUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.is_admin);
}

export async function moderateStory(args: {
  storyId: string;
  status: "published" | "rejected" | "pending";
  rejectionReason?: string;
}) {
  await ensureUser();
  const supabase = createClient();
  const payload: Record<string, unknown> = {
    status: args.status,
    is_published: args.status === "published",
    updated_at: new Date().toISOString(),
  };
  if (args.status === "rejected") {
    payload.rejection_reason =
      args.rejectionReason?.trim() || "Not approved for Discover.";
  }
  if (args.status === "published" || args.status === "pending") {
    payload.rejection_reason = null;
  }

  const { error } = await supabase
    .from("stories")
    .update(payload)
    .eq("id", args.storyId);

  if (error) throw error;
}
