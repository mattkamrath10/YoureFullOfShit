"use client";

import Link from "next/link";

/**
 * Free-account gate modal for social actions.
 * Guests see Like/Comment/Share/Follow/Report UI, but clicks open this prompt.
 * Never surfaces raw Supabase 42501 / permission denied text.
 */
export function SignInPrompt({
  open,
  onClose,
  action,
}: {
  open: boolean;
  onClose: () => void;
  /** Optional context; primary copy is always the FREE account line. */
  action?: string;
}) {
  if (!open) return null;

  void action;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-account-prompt-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(249,115,22,0.2)] md:max-w-md md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-orange-300">
          Join the conversation
        </p>
        <h2
          id="free-account-prompt-title"
          className="mt-2 text-center text-xl font-black text-white"
        >
          Create a FREE account to join the conversation.
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Guests can discover, read, watch, listen, and submit text stories.
          Like, comment, share, follow, and report need a free account.
        </p>
        <div className="mt-5 grid gap-2">
          <Link
            href="/create-account"
            className="rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-black hover:bg-orange-400"
          >
            Create Free Account
          </Link>
          <Link
            href="/sign-in"
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-bold text-zinc-100 hover:bg-white/10"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-zinc-500 hover:text-zinc-300"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

/** Alias used by gated pages. */
export const FreeAccountPrompt = SignInPrompt;
