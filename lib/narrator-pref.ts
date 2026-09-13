"use client";

import { createClient } from "@/lib/supabase/client";
import { DEFAULT_NARRATOR_ID, getNarrator } from "@/lib/narrators";

export const NARRATOR_PREF_KEY = "yfos-narrator-avatar-id";

function readLocal(): string {
  if (typeof window === "undefined") return DEFAULT_NARRATOR_ID;
  try {
    const raw = window.localStorage.getItem(NARRATOR_PREF_KEY);
    return getNarrator(raw).id;
  } catch {
    return DEFAULT_NARRATOR_ID;
  }
}

function writeLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NARRATOR_PREF_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekNarratorAvatarId(): string {
  return readLocal();
}

/**
 * Load the viewer's storyteller. Profile wins when signed in;
 * localStorage covers guests and first paint.
 */
export async function loadNarratorAvatarId(): Promise<string> {
  const local = readLocal();
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return local;

    const { data, error } = await supabase
      .from("profiles")
      .select("narrator_avatar_id")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return local;
    const id = getNarrator(
      (data.narrator_avatar_id as string | null | undefined) ?? local,
    ).id;
    writeLocal(id);
    return id;
  } catch {
    return local;
  }
}

export async function saveNarratorAvatarId(
  id: string,
): Promise<{ id: string; persisted: "profile" | "device" }> {
  const next = getNarrator(id).id;
  writeLocal(next);

  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return { id: next, persisted: "device" };

    const { error } = await supabase
      .from("profiles")
      .update({ narrator_avatar_id: next })
      .eq("id", userId);

    if (error) return { id: next, persisted: "device" };
    return { id: next, persisted: "profile" };
  } catch {
    return { id: next, persisted: "device" };
  }
}
