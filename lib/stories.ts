import { createClient } from "@/lib/supabase/server";
import type { Category, Story, StoryMedia, VoteTallies } from "@/types/database";
import { getR2PlaybackUrl } from "@/lib/r2/playback";
import { isR2Configured } from "@/lib/r2/config";

export type StoryMediaView = StoryMedia & { url: string | null };

export async function getPublishedStories(): Promise<Story[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select(
      "*, categories(*), profiles(*), story_media(id, media_type, mime_type)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Story[];
}

export async function getStoryById(id: string): Promise<Story | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*, categories(*), profiles(*), story_media(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Story | null) ?? null;
}

function isR2Media(item: StoryMedia): boolean {
  if (item.storage_provider === "r2") return true;
  if (item.storage_provider === "supabase") return false;
  // Heuristic before/without migration: R2 keys use stories/{uuid}/...
  return item.storage_path.startsWith("stories/");
}

export async function getSignedMedia(
  media: StoryMedia[] | undefined,
): Promise<StoryMediaView[]> {
  if (!media?.length) return [];
  const supabase = await createClient();
  const out: StoryMediaView[] = [];

  for (const item of media) {
    let url: string | null = null;
    if (isR2Media(item)) {
      if (isR2Configured()) {
        // Always signed GET — safe for pending/anonymous/moderated stories
        url = await getR2PlaybackUrl(item.storage_path, {
          expiresInSeconds: 60 * 60,
          preferPublic: false,
        });
      } else {
        url = null;
      }
    } else {
      const { data } = await supabase.storage
        .from("story-media")
        .createSignedUrl(item.storage_path, 60 * 60);
      url = data?.signedUrl ?? null;
    }
    out.push({ ...item, url });
  }

  return out.sort((a, b) => a.sort_order - b.sort_order);
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getMyStories(): Promise<Story[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("stories")
    .select("*, categories(*), story_media(id)")
    .eq("author_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Story[];
}

export async function getVoteTallies(storyId: string): Promise<VoteTallies> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("story_votes")
    .select("verdict")
    .eq("story_id", storyId);

  if (error) throw error;

  const tallies: VoteTallies = {
    believe: 0,
    maybe: 0,
    full_of_shit: 0,
    total: 0,
  };

  for (const row of data ?? []) {
    const v = row.verdict as keyof Omit<VoteTallies, "total">;
    if (v in tallies) {
      tallies[v] += 1;
      tallies.total += 1;
    }
  }

  return tallies;
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function groupMediaViews(media: StoryMediaView[]) {
  return {
    videos: media.filter((m) => m.media_type === "video"),
    images: media.filter((m) => m.media_type === "image"),
    documents: media.filter((m) => m.media_type === "document"),
  };
}
