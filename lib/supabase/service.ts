import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for privileged server jobs only (admin email lookup, dedupe).
 * Never import this into client components or expose the key via NEXT_PUBLIC_*.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for service client.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
