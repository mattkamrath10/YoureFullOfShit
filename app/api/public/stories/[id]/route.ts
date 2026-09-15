import { apiError } from "@/lib/api/auth";
import { getStoryById } from "@/lib/stories";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return apiError("INVALID_STORY_ID", "Invalid story.", 400);
  try {
    const story = await getStoryById(id);
    if (!story || story.status !== "published") return apiError("NOT_FOUND", "Story not found.", 404);
    return Response.json({ data: {
      id: story.id, title: story.title, body: story.body, preview: story.preview, createdAt: story.created_at,
      category: story.categories ? { slug: story.categories.slug, name: story.categories.name } : null,
      author: story.is_anonymous ? null : story.profiles?.display_name ?? null, isAnonymous: story.is_anonymous,
      likeCount: story.like_count ?? 0, commentCount: story.comment_count ?? 0,
      media: (story.story_media ?? []).map(({ id: mediaId, media_type, file_name, mime_type }) => ({ id: mediaId, type: media_type, fileName: file_name, mimeType: mime_type })),
    } });
  } catch {
    return apiError("STORY_UNAVAILABLE", "Story is temporarily unavailable.", 503);
  }
}
