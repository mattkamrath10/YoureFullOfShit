import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryDetail } from "@/components/StoryDetail";
import { isEmailAuthUser } from "@/lib/auth/session";
import { buildStoryMetadata } from "@/lib/site-metadata";
import { getSignedMedia, getStoryById } from "@/lib/stories";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const story = await getStoryById(id);
  if (!story) {
    return { title: "Story not found" };
  }

  // Only expose public published stories in social previews.
  const isPublic =
    story.status === "published" ||
    (story.is_published === true &&
      story.status !== "rejected" &&
      story.status !== "pending" &&
      story.status !== "draft");

  if (!isPublic) {
    return {
      title: "You're Full of Shit",
      description:
        "Everybody has a story. Like, comment, and share. Entertainment — not factual verification.",
      robots: { index: false, follow: false },
    };
  }

  return buildStoryMetadata({
    id: story.id,
    title: story.title,
    preview: story.preview,
    body: story.body,
  });
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStoryById(id);
  if (!story) notFound();

  const media = await getSignedMedia(story.story_media);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let canDelete = Boolean(isEmailAuthUser(user) && story.author_id === user?.id);
  const isOwner = canDelete;

  if (isEmailAuthUser(user) && !canDelete) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    canDelete = Boolean(profile?.is_admin);
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
        media={media}
        canDelete={canDelete}
        deleteRedirect={isOwner ? "/my-stories" : "/admin/stories"}
      />
    </div>
  );
}
