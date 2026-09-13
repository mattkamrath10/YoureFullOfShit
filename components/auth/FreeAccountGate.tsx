"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Page-level gate: only real email accounts see children.
 * Guests / anonymous see the FREE account prompt (no raw permission errors).
 */
export function FreeAccountGate({
  children,
  title = "Account required",
  subtitle = "Create a FREE account to join the conversation.",
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const { loading, isSignedIn } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-orange-400/20 bg-zinc-900/70 p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
          Join free
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
        <p className="text-sm leading-relaxed text-zinc-400">{subtitle}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/create-account"
            className="rounded-full bg-orange-500 px-5 py-2.5 text-center text-sm font-black uppercase tracking-wide text-black"
          >
            Create Free Account
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full border border-white/15 px-5 py-2.5 text-center text-sm font-semibold text-zinc-200"
          >
            Sign In
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          Guests can still discover stories and submit text on Tell Your Story.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
