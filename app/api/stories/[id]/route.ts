import { apiError, getAuthenticatedUser } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/service";

async function access(request: Request, id: string) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: apiError("UNAUTHORIZED", "Authentication required.", 401) };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: apiError("INVALID_STORY_ID", "Invalid story.", 400) };
  const service = createServiceClient();
  const { data: story } = await service.from("stories").select("id, author_id").eq("id", id).maybeSingle();
  if (!story) return { error: apiError("NOT_FOUND", "Story not found.", 404) };
  const { data: profile } = await service.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (story.author_id !== user.id && !profile?.is_admin) return { error: apiError("FORBIDDEN", "Not allowed.", 403) };
  return { service, story };
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const result = await access(request, id); if ("error" in result) return result.error;
  let body: { title?: unknown; text?: unknown; categoryId?: unknown }; try { body = await request.json(); } catch { return apiError("INVALID_REQUEST", "Invalid JSON.", 400); }
  const update: Record<string, string> = {};
  if (typeof body.title === "string" && body.title.trim() && body.title.trim().length <= 120) update.title = body.title.trim();
  if (typeof body.text === "string" && body.text.trim() && body.text.trim().length <= 20000) { update.body = body.text.trim(); update.preview = body.text.trim().slice(0, 160); }
  if (typeof body.categoryId === "string" && body.categoryId.trim()) update.category_id = body.categoryId.trim();
  if (!Object.keys(update).length) return apiError("INVALID_STORY", "No valid changes supplied.", 400);
  const { data, error } = await result.service.from("stories").update(update).eq("id", id).select("id, status").single();
  if (error) return apiError("STORY_UPDATE_FAILED", "Could not update story.", 400); return Response.json({ data });
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const result = await access(request, id); if ("error" in result) return result.error;
  const { error } = await result.service.from("stories").delete().eq("id", id);
  if (error) return apiError("STORY_DELETE_FAILED", "Could not delete story.", 500); return Response.json({ data: { deleted: true } });
}
