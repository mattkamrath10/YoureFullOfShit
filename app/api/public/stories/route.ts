import { apiError } from "@/lib/api/auth";
import { getPublishedStories } from "@/lib/stories";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category")?.trim().toLowerCase();
  const query = params.get("q")?.trim().toLowerCase() ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const limit = Math.min(PAGE_SIZE, Math.max(1, Number(params.get("limit") ?? PAGE_SIZE) || PAGE_SIZE));
  try {
    let stories = await getPublishedStories();
    if (category && category !== "most-recent") stories = stories.filter((story) => story.categories?.slug === category);
    if (query) stories = stories.filter((story) => [story.title, story.preview, story.categories?.name ?? "", story.is_anonymous ? "anonymous" : story.profiles?.display_name ?? ""].join(" ").toLowerCase().includes(query));
    const start = (page - 1) * limit;
    const data = stories.slice(start, start + limit).map((story) => ({
      id: story.id, title: story.title, preview: story.preview, createdAt: story.created_at,
      category: story.categories ? { slug: story.categories.slug, name: story.categories.name } : null,
      author: story.is_anonymous ? null : story.profiles?.display_name ?? null,
      isAnonymous: story.is_anonymous, likeCount: story.like_count ?? 0, commentCount: story.comment_count ?? 0,
      media: (story.story_media ?? []).map(({ id, media_type, mime_type }) => ({ id, type: media_type, mimeType: mime_type })),
    }));
    return Response.json({ data, pagination: { page, limit, total: stories.length, hasMore: start + data.length < stories.length } });
  } catch {
    return apiError("STORIES_UNAVAILABLE", "Stories are temporarily unavailable.", 503);
  }
}
