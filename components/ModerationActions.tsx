"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moderateStory } from "@/lib/admin";

export function ModerationActions({
  storyId,
  status,
  onStatusChange,
}: {
  storyId: string;
  status: string;
  /** Optimistic local update before refresh */
  onStatusChange?: (
    storyId: string,
    next: "published" | "rejected" | "pending",
  ) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  function run(next: "published" | "rejected" | "pending") {
    setError(null);
    setConfirmReject(false);
    onStatusChange?.(storyId, next);
    startTransition(async () => {
      try {
        await moderateStory({
          storyId,
          status: next,
          rejectionReason: next === "rejected" ? reason : undefined,
        });
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Moderation action failed. Please try again.",
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
      {status === "pending" && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional rejection reason (shown to author)"
          rows={2}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
        />
      )}

      {confirmReject ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-center">
          <p className="text-sm font-semibold text-rose-100">
            Reject this story?
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmReject(false)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase text-zinc-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("rejected")}
              className="rounded-full bg-rose-500 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
            >
              Reject Story
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {status !== "published" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run("published")}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {status !== "rejected" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmReject(true)}
              className="rounded-full bg-rose-500 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
            >
              Reject
            </button>
          )}
          {status !== "pending" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run("pending")}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase text-zinc-200 disabled:opacity-50"
            >
              Move to pending
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="text-center text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
