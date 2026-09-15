"use client";

import Link from "next/link";
import { FreeAccountGate } from "@/components/auth/FreeAccountGate";
import { StoryDeleteButton } from "@/components/StoryDeleteButton";

export type MyStoryRow = {
  id: string;
  title: string;
  preview: string | null;
  status: string | null;
  is_anonymous: boolean | null;
  created_at: string;
  rejection_reason?: string | null;
  categories?: { name?: string | null } | null;
  story_media?: { id: string }[] | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending review",
  published: "Published",
  rejected: "Rejected",
};

function statusTone(status: string): string {
  switch (status) {
    case "published":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "rejected":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    case "pending":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    default:
      return "border-white/15 bg-white/5 text-zinc-300";
  }
}

export function MyStoriesClient({ stories }: { stories: MyStoryRow[] }) {
  return (
    <FreeAccountGate
      title="My Stories"
      subtitle="Create a FREE account to join the conversation. Track your submissions here after you sign in."
    >
      <div className="space-y-6">
        <section className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
            Creator
          </p>
          <h1 className="text-3xl font-black text-white">My Stories</h1>
          <p className="text-sm text-zinc-400">
            Track review status for every story you submit.
          </p>
        </section>

        {stories.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
            No stories yet.{" "}
            <Link href="/tell" className="font-semibold text-orange-300">
              Tell your first one
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-3">
            {stories.map((story) => {
              const status = story.status ?? "pending";
              const mediaCount = story.story_media?.length ?? 0;
              const date = new Date(story.created_at).toLocaleString();
              return (
                <article
                  key={story.id}
                  className="rounded-3xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-white/20"
                >
                  <Link href={`/story/${story.id}`} className="block">
                    <div className="mb-2 flex flex-wrap justify-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-zinc-200">
                        {story.categories?.name ?? "Uncategorized"}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 ${statusTone(status)}`}
                      >
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-400">
                        {mediaCount} media
                      </span>
                    </div>
                    <h2 className="text-center text-lg font-black text-white">
                      {story.title}
                    </h2>
                    {status === "rejected" && story.rejection_reason ? (
                      <p className="mt-2 rounded-2xl border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-center text-xs text-rose-100">
                        {story.rejection_reason}
                      </p>
                    ) : null}
                    <p className="mt-2 text-center text-xs text-zinc-500">{date}</p>
                  </Link>
                  <div className="mt-3 flex justify-center">
                    <StoryDeleteButton
                      storyId={story.id}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/tell"
            className="inline-flex rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black uppercase text-black"
          >
            Tell another story
          </Link>
        </div>
      </div>
    </FreeAccountGate>
  );
}
