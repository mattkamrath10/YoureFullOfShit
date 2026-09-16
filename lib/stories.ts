import { createClient } from "@/lib/supabase/server";
import type { Category, Story, StoryMedia, VoteTallies } from "@/types/database";
import { getR2PlaybackUrl } from "@/lib/r2/playback";
import { isR2Configured } from "@/lib/r2/config";

export type StoryMediaView = StoryMedia & { url: string | null };

type CountEmbed = { count: number }[] | null | undefined;

function embedCount(value: CountEmbed): number {
  if (!value || !Array.isArray(value) || value.length === 0) return 0;
  const n = value[0]?.count;
  return typeof n === "number" ? n : 0;
}

function withSocialCounts(row: Record<string, unknown>): Story {
  const like_count = embedCount(
    (row.story_likes ?? row.likes) as CountEmbed,
  );
  const comment_count = embedCount(
    (row.story_comments ?? row.comments) as CountEmbed,
  );
  const {
    story_likes: _l,
    story_comments: _c,
    likes: _likes,
    comments: _comments,
    ...rest
  } = row;
  return {
    ...(rest as Story),
    like_count,
    comment_count,
  };
}

const PUBLISHED_SELECT_WITH_COUNTS =
  "*, categories(*), profiles(*), story_media(id, media_type, mime_type), likes:story_likes(count), comments:story_comments(count)";
const PUBLISHED_SELECT_BASIC =
  "*, categories(*), profiles(*), story_media(id, media_type, mime_type)";
const STORY_SELECT_WITH_COUNTS =
  "*, categories(*), profiles(*), story_media(*), likes:story_likes(count), comments:story_comments(count)";
const STORY_SELECT_BASIC =
  "*, categories(*), profiles(*), story_media(*)";

export async function getPublishedStories(): Promise<Story[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const blockedAuthorIds = new Set<string>();
  if (auth.user) {
    const { data: blocks } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", auth.user.id);
    for (const block of blocks ?? []) blockedAuthorIds.add(block.blocked_id as string);
  }
  const withCounts = await supabase
    .from("stories")
    .select(PUBLISHED_SELECT_WITH_COUNTS)
    .eq("status", "published")
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  if (!withCounts.error) {
    return (withCounts.data ?? [])
      .map((row) => withSocialCounts(row as Record<string, unknown>))
      .filter((story) => !story.author_id || !blockedAuthorIds.has(story.author_id));
  }

  // Fallback before social migration is applied
  const basic = await supabase
    .from("stories")
    .select(PUBLISHED_SELECT_BASIC)
    .eq("status", "published")
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  if (basic.error) throw withCounts.error;
  return ((basic.data ?? []) as Story[])
    .map((s) => ({ ...s, like_count: s.like_count ?? 0, comment_count: s.comment_count ?? 0 }))
    .filter((story) => !story.author_id || !blockedAuthorIds.has(story.author_id));
}

export async function getStoryById(id: string): Promise<Story | null> {
  const supabase = await createClient();
  const withCounts = await supabase
    .from("stories")
    .select(STORY_SELECT_WITH_COUNTS)
    .eq("id", id)
    .maybeSingle();

  if (!withCounts.error) {
    if (!withCounts.data) return null;
    return withSocialCounts(withCounts.data as Record<string, unknown>);
  }

  const basic = await supabase
    .from("stories")
    .select(STORY_SELECT_BASIC)
    .eq("id", id)
    .maybeSingle();

  if (basic.error) throw withCounts.error;
  if (!basic.data) return null;
  const story = basic.data as Story;
  return {
    ...story,
    like_count: story.like_count ?? 0,
    comment_count: story.comment_count ?? 0,
  };
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

/** @deprecated Soft-retired from UI — story_votes table remains. */
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
