"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import { validateEmail } from "@/lib/auth/validation";
import {
  AuthCard,
  authInputClass,
  authLinkClass,
  authPrimaryBtnClass,
} from "@/components/auth/AuthCard";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );
      if (resetError) throw resetError;
      setInfo("If an account exists for that email, a reset link is on the way.");
    } catch (err) {
      setError(friendlyAuthError(err, "Could not send reset email."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Reset"
      title="Forgot password"
      subtitle="We’ll email you a link to choose a new password."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            placeholder="you@example.com"
            disabled={pending}
            required
          />
        </label>

        {error && (
          <p className="text-center text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="text-center text-sm text-emerald-300" role="status">
            {info}
          </p>
        )}

        <button type="submit" disabled={pending} className={authPrimaryBtnClass}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/sign-in" className={authLinkClass}>
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
