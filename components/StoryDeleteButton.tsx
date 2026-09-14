"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function StoryDeleteButton({
  storyId,
  onDeleted,
  redirectTo,
}: {
  storyId: string;
  onDeleted?: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function deleteStory() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/stories/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(result.error ?? "Could not delete this story.");
        }
        onDeleted?.();
        if (redirectTo) {
          router.replace(redirectTo);
        } else {
          router.refresh();
        }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not delete this story. Please try again.",
        );
      }
    });
  }

  if (confirming) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-center">
        <p className="text-sm font-semibold text-rose-100">
          Delete this story permanently?
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase text-zinc-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={deleteStory}
            className="rounded-full bg-rose-500 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete Story"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-rose-200" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => setConfirming(true)}
      className="rounded-full border border-rose-400/50 bg-rose-500/10 px-4 py-2 text-xs font-black uppercase text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
