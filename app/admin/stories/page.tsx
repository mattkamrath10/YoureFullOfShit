import Link from "next/link";
import { ModerationDashboard } from "@/components/ModerationDashboard";
import { getModerationQueue, requireAdmin } from "@/lib/stories-admin";

export const dynamic = "force-dynamic";

export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ story?: string | string[] }>;
}) {
  const admin = await requireAdmin();

  if (!admin) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-black text-white">Forbidden</h1>
        <p className="text-sm text-zinc-400">
          This moderation area is only available to administrators.
        </p>
        <p className="text-xs text-zinc-500">
          Access is gated by{" "}
          <code className="text-orange-300">profiles.is_admin</code> on the
          server. Ask an existing admin to promote your account in Supabase, then
          refresh.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  const stories = await getModerationQueue();
  const sp = searchParams ? await searchParams : undefined;
  const raw = sp?.story;
  const highlightStoryId = Array.isArray(raw)
    ? raw[0]?.trim() || null
    : raw?.trim() || null;

  return (
    <div className="space-y-6">
      <section className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
          Moderation
        </p>
        <h1 className="text-3xl font-black text-white">Review center</h1>
        <p className="mx-auto max-w-xl text-sm text-zinc-400">
          Stories: approve to publish on Discover; reject keeps the story private
          for the author. Comments: restore or remove reported / pending items.
        </p>
      </section>
      <ModerationDashboard
        initialStories={stories}
        highlightStoryId={highlightStoryId}
      />
    </div>
  );
}
