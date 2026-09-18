import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildFallbackPlusUsage,
  parsePlusUsage,
  type PlusUsage,
} from "@/lib/plus/usage";

/**
 * Load the canonical A0 usage response. The fallback still delegates the
 * entitlement decision to user_has_plus(auth.uid()); it only protects clients
 * from older A0 installs whose get_plus_usage referenced a nonexistent
 * r2_upload_reservations.status column.
 */
export async function getAuthoritativePlusUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlusUsage | null> {
  const { data, error } = await supabase.rpc("get_plus_usage");
  if (!error) {
    const parsed = parsePlusUsage(data);
    if (parsed) return parsed;
  }

  const [{ data: hasPlus, error: plusError }, { data: profile }] =
    await Promise.all([
      supabase.rpc("user_has_plus", { p_user_id: userId }),
      supabase
        .from("profiles")
        .select("stories_submitted_count")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  if (plusError || typeof hasPlus !== "boolean") return null;

  return buildFallbackPlusUsage({
    hasPlus,
    storiesSubmittedCount: profile?.stories_submitted_count ?? 0,
  });
}
