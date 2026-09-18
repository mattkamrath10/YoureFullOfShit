import { apiError, createUserClientFromRequest, getAuthenticatedUser } from "@/lib/api/auth";
import { isEmailAuthUser } from "@/lib/auth/session";
import { getAuthoritativePlusUsage } from "@/lib/plus/authoritative-usage";

/**
 * Read-only Plus usage for the signed-in caller.
 * Uses the request JWT so Postgres `get_plus_usage` / `user_has_plus(auth.uid())`
 * is the source of truth. Does not accept a user id from the client.
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !isEmailAuthUser(user)) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  try {
    const supabase = await createUserClientFromRequest(request);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || auth.user.id !== user.id || !isEmailAuthUser(auth.user)) {
      return apiError("UNAUTHORIZED", "Authentication required.", 401);
    }

    const usage = await getAuthoritativePlusUsage(supabase, user.id);
    if (!usage) {
      return apiError("PLUS_USAGE_UNAVAILABLE", "Could not load Plus membership.", 503);
    }
    return Response.json({ data: usage });
  } catch {
    return apiError("PLUS_USAGE_UNAVAILABLE", "Could not load Plus membership.", 503);
  }
}
