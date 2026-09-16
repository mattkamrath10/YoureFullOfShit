import { apiError, getAuthenticatedUser } from "@/lib/api/auth";
import { isEmailAuthUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !isEmailAuthUser(user)) return apiError("UNAUTHORIZED", "An email account is required.", 401);
  try {
    const { data, error } = await createServiceClient().from("user_blocks").select("blocked_id, created_at, profiles!user_blocks_blocked_id_fkey(id, display_name, avatar_url)").eq("blocker_id", user.id);
    if (error) throw error;
    return Response.json({ data: data ?? [] });
  } catch { return apiError("BLOCK_LIST_FAILED", "Could not retrieve blocked users.", 500); }
}
