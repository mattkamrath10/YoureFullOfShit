import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { getPublishedStories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stories = await getPublishedStories();
  // Same selection as before: newest published story first (not manually curated).
  const [mostRecent, ...rest] = stories;

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
          Discover
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Unbelievable stories.
          <span className="block text-orange-400">You&apos;re Full of Shit.</span>
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Read wild stories from the feed.{" "}
          <span className="text-rose-300">Like</span>,{" "}
          <span className="text-orange-300">comment</span>,{" "}
          <span className="text-sky-300">share</span>, and{" "}
          <span className="text-amber-300">follow</span> storytellers you want
          more from. Entertainment — not fact checks.
        </p>
        <div className="pt-1">
          <Link
            href="/tell"
            className="inline-flex rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_24px_rgba(249,115,22,0.35)] hover:bg-orange-400"
          >
            Tell Your Story
          </Link>
        </div>
      </section>

      {mostRecent ? (
        <section className="space-y-3">
          <h2 className="text-center text-sm font-bold uppercase tracking-wide text-zinc-500">
            Most recent story
          </h2>
          <StoryCard story={mostRecent} emphasized />
        </section>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 text-center text-sm text-zinc-400">
          No published stories yet.
        </p>
      )}

      {rest.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-center text-sm font-bold uppercase tracking-wide text-zinc-500">
            More stories
          </h2>
          <div className="grid gap-3">
            {rest.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
