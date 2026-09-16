import { apiError, createUserClientFromRequest, getAuthenticatedUser } from "@/lib/api/auth";
import { plusErrorMessage } from "@/lib/plus/errors";
import { isEmailAuthUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !isEmailAuthUser(user)) {
    return apiError("EMAIL_ACCOUNT_REQUIRED", "Create an account to tell your story.", 401);
  }
  const limited = rateLimit({ key: `story:${user.id}`, limit: 10, windowMs: 10 * 60_000 });
  if (!limited.ok) {
    return apiError("RATE_LIMITED", "Too many story submissions. Try again shortly.", 429);
  }

  let body: { title?: unknown; categoryId?: unknown; text?: unknown; isAnonymous?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_REQUEST", "Invalid JSON.", 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!title || title.length > 120 || !categoryId || text.length > 20000) {
    return apiError("INVALID_STORY", "A title and category are required.", 400);
  }

  try {
    const supabase = await createUserClientFromRequest(request);
    const preview = text ? text.slice(0, 160) : title.slice(0, 160);
    const { data, error } = await supabase.rpc("create_pending_story", {
      p_category_id: categoryId,
      p_title: title,
      p_body: text,
      p_preview: preview,
      p_is_anonymous: body.isAnonymous !== false,
    });
    if (error) {
      const mapped = plusErrorMessage(error);
      if (mapped) return apiError(mapped.code, mapped.message, mapped.status);
      throw error;
    }
    return Response.json({ data: { id: data, status: "pending" } }, { status: 201 });
  } catch {
    return apiError("STORY_CREATE_FAILED", "Could not create story.", 400);
  }
}
