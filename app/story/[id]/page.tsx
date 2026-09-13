import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryDetail } from "@/components/StoryDetail";
import { createClient } from "@/lib/supabase/server";
import { getSignedMedia, getStoryById, getVoteTallies } from "@/lib/stories";
import type { Verdict } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStoryById(id);
  if (!story) notFound();

  const tallies = await getVoteTallies(id);
  const media = await getSignedMedia(story.story_media);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  let myVote: Verdict | null = null;
  if (auth.user) {
    const { data } = await supabase
      .from("story_votes")
      .select("verdict")
      .eq("story_id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    myVote = (data?.verdict as Verdict | undefined) ?? null;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex text-sm font-semibold text-zinc-400 hover:text-orange-300"
      >
        Back to Discover
      </Link>
      <StoryDetail
        story={story}
        tallies={tallies}
        myVote={myVote}
        media={media}
      />
    </div>
  );
}
