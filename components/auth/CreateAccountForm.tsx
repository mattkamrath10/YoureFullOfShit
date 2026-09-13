"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
} from "@/lib/auth/validation";
import {
  AuthCard,
  authInputClass,
  authLinkClass,
  authPrimaryBtnClass,
} from "@/components/auth/AuthCard";

export function CreateAccountForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }
    const matchErr = validatePasswordMatch(password, confirm);
    if (matchErr) {
      setError(matchErr);
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signError) throw signError;

      // Email confirm required → session often null until user clicks the link.
      if (!data.session) {
        setInfo(
          "Check your email to confirm your account, then come back to sign in.",
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err, "Could not create account."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Join in"
      title="Create account"
      subtitle="Email and password only. You can still post stories anonymously."
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
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            placeholder="At least 6 characters"
            disabled={pending}
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
            Confirm password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass}
            placeholder="Repeat password"
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
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/sign-in" className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
