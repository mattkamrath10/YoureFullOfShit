"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignInPrompt } from "@/components/social/SignInPrompt";
import {
  addComment,
  deleteOwnComment,
  listComments,
  reportComment,
} from "@/lib/social/comments";
import type { StoryComment } from "@/types/database";
import {
  needsAccountPrompt,
  toErrorMessage,
} from "@/lib/social/errors";

function authorLabel(c: StoryComment): string {
  return (
    c.profiles?.display_name?.trim() ||
    c.profiles?.username?.trim() ||
    "Member"
  );
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function CommentSection({
  storyId,
  onCountChange,
}: {
  storyId: string;
  onCountChange?: (n: number) => void;
}) {
  const { isSignedIn, user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [promptOpen, setPromptOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function refresh() {
    const rows = await listComments(storyId);
    setComments(rows);
    onCountChange?.(rows.length);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listComments(storyId)
      .then((rows) => {
        if (cancelled) return;
        setComments(rows);
        onCountChange?.(rows.length);
      })
      .catch((err) => {
        if (cancelled) return;
        if (needsAccountPrompt(err)) {
          setError(null);
        } else {
          setError(toErrorMessage(err, "Could not load comments."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  function openPrompt() {
    setPromptOpen(true);
    setError(null);
  }

  function handleSocialError(err: unknown, fallback: string) {
    if (needsAccountPrompt(err)) {
      openPrompt();
      return;
    }
    setError(toErrorMessage(err, fallback));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    if (authLoading) return;
    if (!isSignedIn) {
      openPrompt();
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write something first.");
      return;
    }

    startTransition(async () => {
      try {
        const created = await addComment(storyId, trimmed);
        setBody("");
        setComments((prev) => [...prev, created]);
        onCountChange?.(comments.length + 1);
        await refresh();
      } catch (err) {
        handleSocialError(err, "Could not post comment.");
      }
    });
  }

  function onDelete(id: string) {
    setError(null);
    if (!isSignedIn) {
      openPrompt();
      return;
    }
    startTransition(async () => {
      try {
        await deleteOwnComment(id);
        setComments((prev) => prev.filter((c) => c.id !== id));
        onCountChange?.(Math.max(0, comments.length - 1));
      } catch (err) {
        handleSocialError(err, "Could not delete comment.");
      }
    });
  }

  function onReport(id: string) {
    setError(null);
    setNote(null);
    if (!isSignedIn) {
      openPrompt();
      return;
    }
    startTransition(async () => {
      try {
        await reportComment(id, "Reported from story page");
        setNote("Thanks — report submitted.");
      } catch (err) {
        handleSocialError(err, "Could not report comment.");
      }
    });
  }

  return (
    <>
      <section
        id="story-comments"
        className="scroll-mt-20 rounded-3xl border border-white/10 bg-zinc-900/50 p-4 sm:p-5"
      >
        <h2 className="text-center text-sm font-bold uppercase tracking-wide text-zinc-400">
          Comments
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-500">
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={
              isSignedIn
                ? "Add a comment…"
                : "Create a FREE account to comment…"
            }
            className="w-full resize-y rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-orange-400/40 focus:ring-2"
            onFocus={() => {
              if (!authLoading && !isSignedIn) openPrompt();
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-600">
              {body.trim().length}/2000
            </span>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-black hover:bg-orange-400 disabled:opacity-60"
            >
              {pending ? "Posting…" : "Post"}
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-3 text-center text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        {note && (
          <p className="mt-3 text-center text-sm text-emerald-300">{note}</p>
        )}

        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-center text-sm text-zinc-500">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">
              No comments yet. Be the first.
            </p>
          ) : (
            comments.map((c) => {
              const mine = user?.id === c.user_id;
              const name = authorLabel(c);
              const avatar = c.profiles?.avatar_url;
              return (
                <article
                  key={c.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950/60 p-3 sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-black text-orange-300">
                          {name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="text-sm font-bold text-zinc-100">{name}</p>
                        <time className="text-[11px] text-zinc-500">
                          {formatWhen(c.created_at)}
                        </time>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                        {c.body}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {mine ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onDelete(c.id)}
                            className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-rose-300"
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onReport(c.id)}
                            className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-amber-300"
                          >
                            Report
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <SignInPrompt
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        action="comment"
      />
    </>
  );
}
