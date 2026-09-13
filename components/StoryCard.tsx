import Link from "next/link";
import type { Story } from "@/types/database";
import {
  getStoryType,
  getStoryTypeLabel,
  STORY_TYPE_BADGE_CLASS,
} from "@/lib/story-type";

export function StoryCard({
  story,
  featured = false,
}: {
  story: Story;
  featured?: boolean;
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

  return (
    <Link
      href={`/story/${story.id}`}
      className={`relative block rounded-3xl border transition ${
        featured
          ? "border-orange-400/40 bg-gradient-to-br from-orange-500/15 via-zinc-900/80 to-zinc-950 p-5 shadow-[0_0_40px_rgba(249,115,22,0.15)] sm:p-6"
          : "border-white/10 bg-zinc-900/60 p-4 hover:border-white/20 hover:bg-zinc-900 sm:p-5"
      }`}
    >
      {/* Top-left: category (+ featured / demo). Top-right: story type. */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
          {featured && (
            <span className="rounded-full bg-orange-500 px-2.5 py-1 text-black">
              Featured
            </span>
          )}
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-zinc-200">
            {category}
          </span>
          {story.is_demo && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-200">
              Demo · Fiction
            </span>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide sm:text-[11px] ${STORY_TYPE_BADGE_CLASS[storyType]}`}
        >
          {storyTypeLabel}
        </span>
      </div>

      <h2
        className={`text-center font-black tracking-tight text-white ${
          featured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
        }`}
      >
        {story.title}
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
        {story.preview}
      </p>
      <div className="mt-4 flex flex-col items-center gap-1 text-xs text-zinc-500 sm:flex-row sm:justify-center sm:gap-3">
        <span>By {teller}</span>
        <span className="hidden text-zinc-700 sm:inline" aria-hidden>
          ·
        </span>
        <span className="tabular-nums text-zinc-400">
          ❤️ {likes}{" "}
          <span className="text-zinc-600">·</span> 💬 {comments}
        </span>
        <span className="hidden text-zinc-700 sm:inline" aria-hidden>
          ·
        </span>
        <span className="font-semibold text-orange-300">Read story →</span>
      </div>
    </Link>
  );
}
