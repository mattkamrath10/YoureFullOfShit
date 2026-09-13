/** Supabase Postgrest errors are plain objects, not always Error instances. */

export const FREE_ACCOUNT_MESSAGE =
  "Create a FREE account to join the conversation.";

export class AuthRequiredError extends Error {
  readonly code = "AUTH_REQUIRED" as const;
  constructor(message = FREE_ACCOUNT_MESSAGE) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export function isAuthRequiredError(err: unknown): boolean {
  if (err instanceof AuthRequiredError) return true;
  if (err instanceof Error && err.name === "AuthRequiredError") return true;
  if (err && typeof err === "object" && (err as { code?: unknown }).code === "AUTH_REQUIRED") {
    return true;
  }
  return false;
}

/** Postgres / PostgREST permission denied (missing GRANT or RLS deny). */
export function isPermissionDenied(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "string") {
    const s = err.toLowerCase();
    return s.includes("42501") || s.includes("permission denied");
  }
  if (typeof err === "object") {
    const e = err as { code?: unknown; message?: unknown; details?: unknown };
    const code = typeof e.code === "string" ? e.code : "";
    const msg = [e.message, e.details]
      .filter((p): p is string => typeof p === "string")
      .join(" ")
      .toLowerCase();
    if (code === "42501") return true;
    if (msg.includes("42501") || msg.includes("permission denied")) return true;
  }
  return false;
}

export function needsAccountPrompt(err: unknown): boolean {
  return isAuthRequiredError(err) || isPermissionDenied(err);
}

export function toErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (needsAccountPrompt(err)) return FREE_ACCOUNT_MESSAGE;
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const e = err as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts = [e.message, e.code, e.details, e.hint]
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      .map((p) => p.trim());
    if (parts.length) {
      const joined = parts.join(" — ");
      if (isPermissionDenied(joined)) return FREE_ACCOUNT_MESSAGE;
      return joined;
    }
  }
  if (typeof err === "string" && err.trim()) {
    if (isPermissionDenied(err)) return FREE_ACCOUNT_MESSAGE;
    return err.trim();
  }
  return fallback;
}

export function asError(err: unknown, fallback: string): Error {
  if (needsAccountPrompt(err)) return new AuthRequiredError();
  return new Error(toErrorMessage(err, fallback));
}
