"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignInPrompt } from "@/components/social/SignInPrompt";
import { getLikeState, toggleLike } from "@/lib/social/likes";
import { getFollowState, toggleFollow } from "@/lib/social/follows";
import { shareStory } from "@/lib/social/share";
import { countVisibleComments } from "@/lib/social/comments";
import {
  needsAccountPrompt,
  toErrorMessage,
} from "@/lib/social/errors";

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n / 1000)}k`;
}

export function StoryActions({
  storyId,
  storyTitle,
  authorId,
  isAnonymousAuthor,
  initialLikeCount = 0,
  initialCommentCount = 0,
}: {
  storyId: string;
  storyTitle: string;
  authorId: string | null;
  isAnonymousAuthor: boolean;
  initialLikeCount?: number;
  initialCommentCount?: number;
}) {
  const { isSignedIn, user, loading: authLoading } = useAuth();
  const [pending, startTransition] = useTransition();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptAction, setPromptAction] = useState("join");
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canFollow =
    Boolean(authorId) &&
    !isAnonymousAuthor &&
    (!user || user.id !== authorId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [like, comments] = await Promise.all([
          getLikeState(storyId),
          countVisibleComments(storyId).catch(() => initialCommentCount),
        ]);
        if (cancelled) return;
        setLiked(like.liked);
        setLikeCount(like.count);
        setCommentCount(comments);
        if (authorId && !isAnonymousAuthor) {
          const follow = await getFollowState(authorId);
          if (cancelled) return;
          setFollowing(follow.following);
          setFollowerCount(follow.followerCount);
        }
      } catch {
        /* keep initial counts */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId, authorId, isAnonymousAuthor, initialCommentCount, isSignedIn]);

  function needSignIn(action: string) {
    setPromptAction(action);
    setPromptOpen(true);
  }

  function handleSocialError(e: unknown, fallback: string) {
    if (needsAccountPrompt(e)) {
      needSignIn("join");
      setError(null);
      return;
    }
    setError(toErrorMessage(e, fallback));
  }

  function onLike() {
    setError(null);
    if (authLoading) return;
    if (!isSignedIn) {
      needSignIn("like");
      return;
    }
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    startTransition(async () => {
      try {
        const next = await toggleLike(storyId);
        setLiked(next.liked);
        setLikeCount(next.count);
      } catch (e) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        handleSocialError(e, "Could not update like.");
      }
    });
  }

  function onFollow() {
    setError(null);
    if (!authorId || !canFollow) return;
    if (authLoading) return;
    if (!isSignedIn) {
      needSignIn("follow");
      return;
    }
    const prev = following;
    const prevCount = followerCount;
    setFollowing(!prev);
    setFollowerCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);

    startTransition(async () => {
      try {
        const next = await toggleFollow(authorId);
        setFollowing(next.following);
        setFollowerCount(next.followerCount);
      } catch (e) {
        setFollowing(prev);
        setFollowerCount(prevCount);
        handleSocialError(e, "Could not update follow.");
      }
    });
  }

  function onShare() {
    setShareNote(null);
    setError(null);
    if (authLoading) return;
    if (!isSignedIn) {
      needSignIn("share");
      return;
    }
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/story/${storyId}`
        : `/story/${storyId}`;
    startTransition(async () => {
      try {
        const result = await shareStory({ url, title: storyTitle });
        if (result.method === "clipboard") {
          setShareNote("Link copied.");
        } else if (result.method === "none" && result.error !== "Share cancelled.") {
          if (needsAccountPrompt(result.error)) {
            needSignIn("share");
          } else {
            setError(result.error);
          }
        }
      } catch (e) {
        handleSocialError(e, "Could not share.");
      }
    });
  }

  function scrollToComments() {
    const el = document.getElementById("story-comments");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const btnBase =
    "inline-flex min-h-11 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-2 text-center transition disabled:opacity-60 sm:min-w-[5.5rem] sm:flex-none sm:px-3";

  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-3 sm:p-4">
        <div className="flex flex-wrap items-stretch justify-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onLike}
            aria-pressed={liked}
            className={`${btnBase} ${
              liked
                ? "border-rose-400/50 bg-rose-500/20 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                : "border-white/10 bg-white/5 text-zinc-200 hover:border-rose-400/30 hover:bg-rose-500/10"
            }`}
          >
            <span className="text-base leading-none" aria-hidden>
              {liked ? "❤️" : "🤍"}
            </span>
            <span className="text-[11px] font-black uppercase tracking-wide">
              Like · {formatCount(likeCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={scrollToComments}
            className={`${btnBase} border-white/10 bg-white/5 text-zinc-200 hover:border-orange-400/30 hover:bg-orange-500/10`}
          >
            <span className="text-base leading-none" aria-hidden>
              💬
            </span>
            <span className="text-[11px] font-black uppercase tracking-wide">
              Comment · {formatCount(commentCount)}
            </span>
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={onShare}
            className={`${btnBase} border-white/10 bg-white/5 text-zinc-200 hover:border-sky-400/30 hover:bg-sky-500/10`}
          >
            <span className="text-base leading-none" aria-hidden>
              ↗
            </span>
            <span className="text-[11px] font-black uppercase tracking-wide">
              Share
            </span>
          </button>

          {canFollow && (
            <button
              type="button"
              disabled={pending}
              onClick={onFollow}
              aria-pressed={following}
              className={`${btnBase} ${
                following
                  ? "border-orange-400/50 bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                  : "border-orange-400/30 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20"
              }`}
            >
              <span className="text-base leading-none" aria-hidden>
                {following ? "✓" : "+"}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wide">
                {following ? "Following" : "Follow"}
                {followerCount > 0 ? ` · ${formatCount(followerCount)}` : ""}
              </span>
            </button>
          )}
        </div>

        {shareNote && (
          <p className="mt-2 text-center text-xs text-emerald-300">{shareNote}</p>
        )}
        {error && (
          <p className="mt-2 text-center text-xs text-red-300" role="alert">
            {error}
          </p>
        )}
      </section>

      <SignInPrompt
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        action={promptAction}
      />
    </>
  );
}
