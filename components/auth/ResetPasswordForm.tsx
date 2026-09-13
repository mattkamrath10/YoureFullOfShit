"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import {
  validatePassword,
  validatePasswordMatch,
} from "@/lib/auth/validation";
import {
  AuthCard,
  authInputClass,
  authLinkClass,
  authPrimaryBtnClass,
} from "@/components/auth/AuthCard";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Recovery links land with tokens; wait for PASSWORD_RECOVERY / signed-in session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

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
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setInfo("Password updated. You’re signed in.");
      setTimeout(() => {
        router.push("/account");
        router.refresh();
      }, 800);
    } catch (err) {
      setError(friendlyAuthError(err, "Could not update password."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Security"
      title="Choose a new password"
      subtitle={
        ready
          ? "Enter a new password for your account."
          : "Open this page from the reset link in your email."
      }
    >
      {!ready ? (
        <p className="text-center text-sm text-zinc-400">
          Waiting for a valid reset session…{" "}
          <Link href="/forgot-password" className={authLinkClass}>
            Request a new link
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">
              New password
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
            {pending ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
