import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isEmailAuthUser } from "@/lib/auth/session";
import type { PlusUsage } from "@/lib/plus/usage";

export async function getPlusUsageForRequest(): Promise<PlusUsage | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !isEmailAuthUser(auth.user)) return null;
  const { data, error } = await supabase.rpc("get_plus_usage");
  if (error || !data) return null;
  return data as PlusUsage;
}
