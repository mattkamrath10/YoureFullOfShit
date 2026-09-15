import { apiError, getAuthenticatedUser } from "@/lib/api/auth";
import { deleteAccount } from "@/lib/account/delete-account";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  try {
    const service = createServiceClient();
    const { data, error } = await service.from("profiles").select("id, display_name, username, avatar_url, narrator_avatar_id").eq("id", user.id).maybeSingle();
    if (error) throw error;
    return Response.json({ data: { id: user.id, email: user.email ?? null, emailConfirmed: Boolean(user.email_confirmed_at), profile: data } });
  } catch { return apiError("ACCOUNT_UNAVAILABLE", "Account is temporarily unavailable.", 503); }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  let body: { confirmation?: unknown } = {};
  try { body = await request.json(); } catch {}
  if (body.confirmation !== "DELETE") return apiError("CONFIRMATION_REQUIRED", "Type DELETE to confirm account deletion.", 400);
  try {
    await deleteAccount(user.id);
    return Response.json({ data: { deleted: true } });
  } catch {
    return apiError("ACCOUNT_DELETE_FAILED", "Account deletion could not be completed.", 500);
  }
}
