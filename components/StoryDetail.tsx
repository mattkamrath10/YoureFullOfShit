import type { Story, Verdict, VoteTallies } from "@/types/database";
import type { StoryMediaView } from "@/lib/stories";
import { groupMediaViews } from "@/lib/stories";
import { VerdictPanel } from "@/components/VerdictPanel";
import { StoryNarrator } from "@/components/StoryNarrator";

export function StoryDetail({
  story,
  tallies,
  myVote,
  media,
}: {
  story: Story;
  tallies: VoteTallies;
  myVote: Verdict | null;
  media: StoryMediaView[];
}) {
  const category = story.categories?.name ?? "Uncategorized";
  const teller = story.is_anonymous
    ? "Anonymous"
    : story.profiles?.display_name ??
      (story.is_demo ? "Demo Storyteller" : "Anonymous");

  const grouped = groupMediaViews(media);
  const hasMedia = media.length > 0;

  return (
    <article className="space-y-6">
      {story.status && story.status !== "published" && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
          Status: <span className="font-bold uppercase">{story.status}</span> —
          not on Discover until published.
        </p>
      )}

      <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap justify-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-zinc-200">
            {category}
          </span>
          {story.is_demo && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-200">
              Demo · Fiction
            </span>
          )}
          {story.is_anonymous && !story.is_demo && (
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-400">
              Anonymous
            </span>
          )}
        </div>
        <h1 className="text-center text-3xl font-black tracking-tight text-white sm:text-4xl">
          {story.title}
        </h1>
        <p className="mt-3 text-center text-sm text-zinc-400">
          Told by <span className="text-zinc-200">{teller}</span>
        </p>
        <div className="prose-invert mt-6 space-y-4 text-left text-[15px] leading-7 text-zinc-200 sm:text-base">
          {story.body.split("\n").map((para, i) =>
            para.trim() ? (
              <p key={i}>{para}</p>
            ) : (
              <div key={i} className="h-2" />
            ),
          )}
        </div>
      </div>

      <StoryNarrator
        title={story.title}
        body={story.body}
        media={media.length ? media : (story.story_media ?? [])}
      />

      {grouped.videos.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
          <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-zinc-400">
            Video
          </h2>
          <div className="space-y-4">
            {grouped.videos.map((v) =>
              v.url ? (
                <video
                  key={v.id}
                  src={v.url}
                  controls
                  playsInline
                  className="w-full rounded-2xl bg-black"
                />
              ) : (
                <p key={v.id} className="text-center text-sm text-zinc-500">
                  Video unavailable
                </p>
              ),
            )}
          </div>
        </section>
      )}

      {grouped.images.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
          <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-zinc-400">
            Photos
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {grouped.images.map((img) =>
              img.url ? (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-2xl border border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.file_name ?? "Story photo"}
                    className="h-auto w-full object-cover"
                  />
                </a>
              ) : null,
            )}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-dashed border-white/15 bg-zinc-950/50 p-5">
        <h2 className="text-center text-sm font-bold uppercase tracking-wide text-zinc-400">
          Evidence
        </h2>
        {grouped.documents.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {grouped.documents.map((doc) => (
              <li key={doc.id} className="text-center">
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-orange-300"
                  >
                    Open {doc.file_name ?? "document"}
                  </a>
                ) : (
                  <span className="text-sm text-zinc-500">
                    {doc.file_name ?? "Document"} unavailable
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-center text-sm text-zinc-500">
            {hasMedia
              ? "No documents attached. Photos/videos are shown above."
              : "No photos, videos, or documents attached to this story."}
          </p>
        )}
      </section>

      <VerdictPanel
        storyId={story.id}
        initialTallies={tallies}
        initialMyVote={myVote}
      />

      <section className="rounded-3xl border border-white/10 bg-zinc-900/40 p-5">
        <h2 className="text-center text-sm font-bold uppercase tracking-wide text-zinc-400">
          Reactions &amp; comments
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Coming later. Verdicts ship first.
        </p>
      </section>
    </article>
  );
}
