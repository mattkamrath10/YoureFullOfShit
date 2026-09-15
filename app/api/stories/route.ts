import { apiError, getAuthenticatedUser } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  let body: { title?: unknown; categoryId?: unknown; text?: unknown; isAnonymous?: unknown };
  try { body = await request.json(); } catch { return apiError("INVALID_REQUEST", "Invalid JSON.", 400); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!title || title.length > 120 || !categoryId || (!text && true) || text.length > 20000) return apiError("INVALID_STORY", "A title, category, and story text are required.", 400);
  try {
    const { data, error } = await createServiceClient().from("stories").insert({ author_id: user.id, category_id: categoryId, title, body: text, preview: text.slice(0, 160), is_anonymous: body.isAnonymous !== false, is_demo: false, is_published: false, status: "pending" }).select("id, status").single();
    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch { return apiError("STORY_CREATE_FAILED", "Could not create story.", 400); }
}
