/** Map Supabase auth errors to short, user-facing copy (no raw dumps). */

export function friendlyAuthError(err: unknown, fallback = "Something went wrong. Try again."): string {
  const raw =
    err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : err instanceof Error
        ? err.message
        : "";

  const msg = raw.toLowerCase();

  if (!msg) return fallback;
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (msg.includes("password should be") || msg.includes("password is known") || msg.includes("weak")) {
    return "Choose a stronger password (at least 6 characters).";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  if (msg.includes("same password")) {
    return "New password must be different from the current one.";
  }
  if (msg.includes("expired") || msg.includes("otp")) {
    return "This reset link expired. Request a new one.";
  }
  if (msg.includes("signup is disabled")) {
    return "New accounts are temporarily disabled.";
  }

  return fallback;
}
