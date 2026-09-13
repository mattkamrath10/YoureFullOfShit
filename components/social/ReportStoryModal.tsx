"use client";

import { useState, useTransition } from "react";
import { reportStory } from "@/lib/social/story-reports";
import {
  needsAccountPrompt,
  toErrorMessage,
} from "@/lib/social/errors";

export function ReportStoryModal({
  open,
  onClose,
  storyId,
  storyTitle,
  onNeedSignIn,
}: {
  open: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
  onNeedSignIn: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function close() {
    setReason("");
    setError(null);
    setDone(false);
    onClose();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await reportStory(storyId, reason);
        setDone(true);
      } catch (err) {
        if (needsAccountPrompt(err)) {
          close();
          onNeedSignIn();
          return;
        }
        setError(toErrorMessage(err, "Could not submit report."));
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-story-title"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(249,115,22,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-300">
              Report received
            </p>
            <h2
              id="report-story-title"
              className="text-xl font-black text-white"
            >
              Thanks for flagging this.
            </h2>
            <p className="text-sm text-zinc-400">
              Moderators will review it. You can only report each story once.
            </p>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-black"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-orange-300">
              Report story
            </p>
            <h2
              id="report-story-title"
              className="text-center text-xl font-black text-white"
            >
              Why are you reporting this?
            </h2>
            <p className="text-center text-xs text-zinc-500 line-clamp-2">
              {storyTitle}
            </p>
            <label className="block space-y-2">
              <span className="sr-only">Reason</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
                rows={4}
                required
                placeholder="Spam, harassment, illegal content, etc."
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-orange-400/40 placeholder:text-zinc-600 focus:ring-2"
              />
              <p className="text-right text-[11px] text-zinc-500">
                {reason.trim().length}/2000
              </p>
            </label>
            {error && (
              <p className="text-center text-xs text-red-300" role="alert">
                {error}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={close}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !reason.trim()}
                className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-black disabled:opacity-50"
              >
                {pending ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
