"use client";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isEmailAuthUser } from "@/lib/auth/session";
import { ensureUser } from "@/lib/votes";
import { AuthRequiredError, FREE_ACCOUNT_MESSAGE } from "@/lib/social/errors";

export { ensureUser, isEmailAuthUser, AuthRequiredError, FREE_ACCOUNT_MESSAGE };

/**
 * Require a real email account for likes / comments / follows / share / report.
 * Anonymous guests and signed-out users throw AuthRequiredError (UI shows free-account prompt).
 */
export async function requireEmailUser(): Promise<User> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !isEmailAuthUser(user)) {
    throw new AuthRequiredError(FREE_ACCOUNT_MESSAGE);
  }
  return user;
}

export async function getOptionalEmailUser(): Promise<User | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !isEmailAuthUser(user)) return null;
  return user;
}
