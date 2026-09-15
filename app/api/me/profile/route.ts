import { apiError, getAuthenticatedUser } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  try {
    const { data, error } = await createServiceClient().from("profiles").select("id, display_name, username, avatar_url, narrator_avatar_id").eq("id", user.id).maybeSingle();
    if (error) throw error;
    return Response.json({ data });
  } catch { return apiError("PROFILE_UNAVAILABLE", "Profile is temporarily unavailable.", 503); }
}
export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  let body: { displayName?: unknown };
  try { body = await request.json(); } catch { return apiError("INVALID_REQUEST", "Invalid JSON.", 400); }
  if (typeof body.displayName !== "string" || body.displayName.trim().length > 60) return apiError("INVALID_PROFILE", "Display name must be 1-60 characters.", 400);
  try {
    const { data, error } = await createServiceClient().from("profiles").update({ display_name: body.displayName.trim() || null }).eq("id", user.id).select("id, display_name, username, avatar_url, narrator_avatar_id").single();
    if (error) throw error;
    return Response.json({ data });
  } catch { return apiError("PROFILE_UPDATE_FAILED", "Could not update profile.", 500); }
}
