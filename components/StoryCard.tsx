import Link from "next/link";
import type { Story } from "@/types/database";
import {
  getStoryType,
  getStoryTypeLabel,
  STORY_TYPE_BADGE_CLASS,
} from "@/lib/story-type";

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const sec = Math.max(0, Math.floor((now - then) / 1000));
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

export function StoryCard({
  story,
  emphasized = false,
}: {
  story: Story;
  emphasized?: boolean;
}) {
  const category = story.categories?.name ?? "Uncategorized";
  const teller = story.is_anonymous
    ? "Anonymous"
    : story.profiles?.display_name ??
      (story.is_demo ? "Demo Storyteller" : "Anonymous");
  const storyType = getStoryType(story.story_media);
  const storyTypeLabel = getStoryTypeLabel(story.story_media);
  const likes = story.like_count ?? 0;
  const comments = story.comment_count ?? 0;
  const when = relativeTime(story.created_at);

  return (
    <Link
      href={`/story/${story.id}`}
      className={`group relative flex items-stretch gap-3 rounded-3xl border bg-zinc-950/80 p-4 transition sm:gap-4 sm:p-5 ${
        emphasized
          ? "border-orange-400/50 shadow-[0_0_36px_rgba(249,115,22,0.18)]"
          : "border-orange-500/20 hover:border-orange-400/45 hover:bg-zinc-900/90"
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* Top-left category · top-right type */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="max-w-[58%] truncate rounded-full border border-orange-400/35 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-200 sm:text-[11px]">
            {category}
          </span>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide sm:text-[11px] ${STORY_TYPE_BADGE_CLASS[storyType]}`}
          >
            {storyTypeLabel}
          </span>
        </div>

        <h2
          className={`text-center font-black tracking-tight text-white ${
            emphasized ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
          }`}
        >
          {story.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
          {story.preview}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          <span>By {teller}</span>
          {when ? (
            <>
              <span className="text-zinc-700" aria-hidden>
                ·
              </span>
              <span>{when}</span>
            </>
          ) : null}
          <span className="text-zinc-700" aria-hidden>
            ·
          </span>
          <span className="tabular-nums text-zinc-400">
            <span className="text-rose-300">♥</span> {likes}
            <span className="mx-1 text-zinc-600">·</span>
            <span className="text-zinc-300">💬</span> {comments}
          </span>
        </div>
      </div>

      <span
        className="flex shrink-0 items-center self-center text-2xl font-light text-zinc-400 transition group-hover:text-orange-300"
        aria-hidden
      >
        ›
      </span>
    </Link>
  );
}
