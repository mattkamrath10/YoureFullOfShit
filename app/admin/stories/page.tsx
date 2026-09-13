import Link from "next/link";
import { ModerationDashboard } from "@/components/ModerationDashboard";
import { getModerationQueue, requireAdmin } from "@/lib/stories-admin";

export const dynamic = "force-dynamic";

export default async function AdminStoriesPage() {
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

  return (
    <div className="space-y-6">
      <section className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
          Moderation
        </p>
        <h1 className="text-3xl font-black text-white">Story review</h1>
        <p className="mx-auto max-w-xl text-sm text-zinc-400">
          Approve to publish on Discover. Reject keeps the story private for the
          author — rejected stories are not deleted.
        </p>
      </section>
      <ModerationDashboard initialStories={stories} />
    </div>
  );
}
