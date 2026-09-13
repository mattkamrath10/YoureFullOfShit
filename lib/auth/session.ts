import type { User } from "@supabase/supabase-js";

/** True when the session is Supabase anonymous auth (guest), not email/password. */
export function isAnonymousAuthUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.is_anonymous === true) return true;
  // Fallback for older payloads: no email and only anonymous identity.
  if (!user.email) {
    const providers = user.app_metadata?.providers;
    if (Array.isArray(providers) && providers.includes("anonymous")) return true;
    if (user.app_metadata?.provider === "anonymous") return true;
  }
  return false;
}

/** Real account for Account menu / account page (email present, not anonymous). */
export function isEmailAuthUser(user: User | null | undefined): boolean {
  return Boolean(user && user.email && !isAnonymousAuthUser(user));
}
