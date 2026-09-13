"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildNarrationText,
  getNarrator,
  storyAllowsNarrator,
  type MediaLike,
} from "@/lib/narrators";
import { loadNarratorAvatarId } from "@/lib/narrator-pref";
import { speakStorySmart, stopStorySpeech } from "@/lib/speech";

export function StoryNarrator({
  title,
  body,
  media,
}: {
  title: string;
  body: string;
  media?: MediaLike[] | null;
}) {
  const eligible = storyAllowsNarrator({ body, media });
  const [narratorId, setNarratorId] = useState(() => getNarrator(null).id);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const narrator = useMemo(() => getNarrator(narratorId), [narratorId]);
  const text = useMemo(() => buildNarrationText(title, body), [title, body]);

  useEffect(() => {
    let cancelled = false;
    loadNarratorAvatarId().then((id) => {
      if (!cancelled) setNarratorId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopStorySpeech();
    };
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        stopStorySpeech();
        setSpeaking(false);
        setLoading(false);
      }
    };
    const onPageHide = () => {
      stopStorySpeech();
      setSpeaking(false);
      setLoading(false);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  if (!eligible) return null;

  async function onRead() {
    setError(null);
    if (!text.trim()) {
      setError("There’s no text to read.");
      return;
    }
    setLoading(true);
    await speakStorySmart({
      text,
      narratorId: narrator.id,
      voiceHint: narrator.voiceHint,
      rate: narrator.rate,
      pitch: narrator.pitch,
      onStart: () => {
        setLoading(false);
        setSpeaking(true);
      },
      onEnd: () => {
        setLoading(false);
        setSpeaking(false);
      },
      onError: (message) => {
        setError(message);
        setLoading(false);
        setSpeaking(false);
      },
    });
  }

  function onStop() {
    stopStorySpeech();
    setSpeaking(false);
    setLoading(false);
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-1.5" aria-label="Storyteller">
      <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-3 rounded-full border border-orange-400/30 bg-black/35 px-3 py-2 sm:gap-4 sm:px-4">
        <div
          className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full border ${
            speaking
              ? "border-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.45)]"
              : "border-white/20"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={narrator.src}
            alt=""
            className={`h-full w-full object-cover ${speaking ? "animate-pulse" : ""}`}
          />
        </div>

        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-bold leading-tight text-white">
            {narrator.name}
          </p>
          <p className="text-[11px] leading-tight text-zinc-400">
            {speaking
              ? "Reading…"
              : loading
                ? "Starting…"
                : "Read by storyteller"}
          </p>
        </div>

        {speaking ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop reading"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-rose-500 px-3 text-xs font-black uppercase tracking-wide text-white hover:bg-rose-400"
          >
            <span aria-hidden className="text-sm leading-none">
              ■
            </span>
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onRead()}
            disabled={loading}
            aria-label="Have storyteller read the story"
            aria-busy={loading}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-orange-500 px-3 text-xs font-black uppercase tracking-wide text-black hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60"
          >
            <span aria-hidden className="text-sm leading-none">
              ▶
            </span>
            {loading ? "…" : "Listen"}
          </button>
        )}

        <Link
          href="/avatars"
          className="shrink-0 text-xs font-bold uppercase tracking-wide text-orange-300 hover:text-orange-200"
          aria-label="Change storyteller avatar"
        >
          Change
        </Link>
      </div>

      {error || speaking ? (
        <p
          role="status"
          aria-live="polite"
          className={`max-w-md px-2 text-center text-[11px] ${
            error ? "text-amber-200" : "font-semibold text-orange-200"
          }`}
        >
          {error ? error : `${narrator.name} is reading…`}
        </p>
      ) : null}
    </div>
  );
}
