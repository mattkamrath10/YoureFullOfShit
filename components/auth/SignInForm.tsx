"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import { validateEmail, validatePassword } from "@/lib/auth/validation";
import {
  AuthCard,
  authInputClass,
  authLinkClass,
  authPrimaryBtnClass,
} from "@/components/auth/AuthCard";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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

    setPending(true);
    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) throw signError;
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err, "Could not sign in."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Use your email and password. Guest voting still works without an account."
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            placeholder="Your password"
            disabled={pending}
            required
          />
        </label>

        <div className="text-right">
          <Link href="/forgot-password" className={`text-xs ${authLinkClass}`}>
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="text-center text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className={authPrimaryBtnClass}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        No account?{" "}
        <Link href="/create-account" className={authLinkClass}>
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
