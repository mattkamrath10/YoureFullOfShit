/**
 * Central story type helpers for Discover cards + admin moderation.
 * Priority: video > audio > text.
 * Speech-to-text body input is still TEXT STORY (no audio media row).
 */

export type StoryType = "video" | "audio" | "text";

export type StoryTypeLabel = "VIDEO STORY" | "AUDIO STORY" | "TEXT STORY";

export type MediaLike = {
  media_type?: string | null;
  mime_type?: string | null;
};

function isVideoItem(item: MediaLike): boolean {
  const type = (item.media_type ?? "").toLowerCase().trim();
  if (type === "video") return true;
  const mime = (item.mime_type ?? "").toLowerCase().trim();
  return mime.startsWith("video/");
}

function isAudioItem(item: MediaLike): boolean {
  const type = (item.media_type ?? "").toLowerCase().trim();
  if (type === "audio") return true;
  const mime = (item.mime_type ?? "").toLowerCase().trim();
  return mime.startsWith("audio/");
}

export function getStoryType(media: MediaLike[] | undefined | null): StoryType {
  if (!media?.length) return "text";
  if (media.some(isVideoItem)) return "video";
  if (media.some(isAudioItem)) return "audio";
  return "text";
}

export function getStoryTypeLabel(
  media: MediaLike[] | undefined | null,
): StoryTypeLabel {
  const t = getStoryType(media);
  if (t === "video") return "VIDEO STORY";
  if (t === "audio") return "AUDIO STORY";
  return "TEXT STORY";
}

export const STORY_TYPE_BADGE_CLASS: Record<StoryType, string> = {
  video:
    "border-sky-400/40 bg-sky-500/15 text-sky-200",
  audio:
    "border-violet-400/40 bg-violet-500/15 text-violet-200",
  text:
    "border-zinc-400/30 bg-white/10 text-zinc-200",
};
