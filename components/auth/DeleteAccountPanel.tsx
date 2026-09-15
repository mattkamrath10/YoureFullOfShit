"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function DeleteAccountPanel() {
  const { isSignedIn, loading, signOut } = useAuth();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (loading) return <p className="text-center text-sm text-zinc-400">Loading account…</p>;
  if (!isSignedIn) return <p className="text-center text-sm text-zinc-400">Please <Link className="text-amber-300" href="/sign-in">sign in</Link> to delete your account.</p>;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (confirmation !== "DELETE") return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/account/delete", { method: "POST" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Account deletion failed.");
        await signOut();
        router.replace("/");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Account deletion failed.");
      }
    });
  }

  return <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 rounded-3xl border border-rose-400/30 bg-zinc-900/70 p-6 text-center">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300">Permanent action</p>
    <h1 className="text-3xl font-black text-white">Delete account</h1>
    <p className="text-sm leading-6 text-zinc-300">This permanently deletes your profile, authored stories, comments, likes, follows, reports, uploaded Supabase media, and R2 video objects. This cannot be undone.</p>
    <label className="block text-left text-sm text-zinc-300">Type <strong className="text-white">DELETE</strong> to confirm
      <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-rose-400/50" />
    </label>
    {error ? <p className="text-sm text-rose-300" role="alert">{error}</p> : null}
    <button disabled={pending || confirmation !== "DELETE"} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white disabled:opacity-50">{pending ? "Deleting…" : "Delete my account"}</button>
    <Link href="/account" className="text-sm text-zinc-400 hover:text-white">Cancel</Link>
  </form>;
}
