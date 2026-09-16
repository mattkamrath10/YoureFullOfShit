import { apiError, getAuthenticatedUser } from "@/lib/api/auth";
import { isEmailAuthUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

async function context(request: Request, targetId: string) {
  const user = await getAuthenticatedUser(request);
  if (!user || !isEmailAuthUser(user)) return { error: apiError("UNAUTHORIZED", "An email account is required.", 401) };
  if (!/^[0-9a-f-]{36}$/i.test(targetId)) return { error: apiError("INVALID_USER_ID", "Invalid user.", 400) };
  if (user.id === targetId) return { error: apiError("SELF_BLOCK", "You cannot block yourself.", 400) };
  const service = createServiceClient();
  const { data: target } = await service.from("profiles").select("id").eq("id", targetId).maybeSingle();
  if (!target) return { error: apiError("NOT_FOUND", "User not found.", 404) };
  return { user, service };
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const value = await context(request, id); if ("error" in value) return value.error;
  const { error } = await value.service.from("user_blocks").upsert({ blocker_id: value.user.id, blocked_id: id }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  if (error) return apiError("BLOCK_FAILED", "Could not block user.", 500); return Response.json({ data: { blocked: true } });
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const value = await context(request, id); if ("error" in value) return value.error;
  const { error } = await value.service.from("user_blocks").delete().eq("blocker_id", value.user.id).eq("blocked_id", id);
  if (error) return apiError("UNBLOCK_FAILED", "Could not unblock user.", 500); return Response.json({ data: { blocked: false } });
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const value = await context(request, id); if ("error" in value) return value.error;
  const { data, error } = await value.service.from("user_blocks").select("id").eq("blocker_id", value.user.id).eq("blocked_id", id).maybeSingle();
  if (error) return apiError("BLOCK_STATUS_FAILED", "Could not retrieve block status.", 500); return Response.json({ data: { blocked: Boolean(data) } });
}
