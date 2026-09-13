"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AvatarUpload } from "@/components/auth/AvatarUpload";
import {
  AuthCard,
  authLinkClass,
  authPrimaryBtnClass,
} from "@/components/auth/AuthCard";

export function AccountPanel() {
  const { user, loading, isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
        Loading account…
      </div>
    );
  }

  if (!isSignedIn || !user?.email) {
    return (
      <AuthCard
        eyebrow="Account"
        title="Create a FREE account to join the conversation."
        subtitle="Manage your profile, avatar, and My Stories with a free account. Guests can still discover stories and submit text."
      >
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
      </AuthCard>
    );
  }

  async function onSignOut() {
    setBusy(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const confirmed = Boolean(user.email_confirmed_at);

  return (
    <AuthCard eyebrow="Account" title="Your account">
      <AvatarUpload userId={user.id} email={user.email} />

      <dl className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Email
          </dt>
          <dd className="mt-1 break-all text-zinc-100">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Status
          </dt>
          <dd className="mt-1 text-zinc-100">
            {confirmed ? (
              <span className="text-emerald-300">Signed in · email confirmed</span>
            ) : (
              <span className="text-orange-300">Signed in · confirm email if prompted</span>
            )}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        disabled={busy}
        onClick={onSignOut}
        className={authPrimaryBtnClass}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/my-stories" className={authLinkClass}>
          My Stories
        </Link>
        {" · "}
        <Link href="/" className={authLinkClass}>
          Discover
        </Link>
      </p>
    </AuthCard>
  );
}
