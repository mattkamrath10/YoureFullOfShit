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
      }
    };
    const onPageHide = () => {
      stopStorySpeech();
      setSpeaking(false);
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
    await speakStorySmart({
      text,
      narratorId: narrator.id,
      voiceHint: narrator.voiceHint,
      rate: narrator.rate,
      pitch: narrator.pitch,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: (message) => {
        setError(message);
        setSpeaking(false);
      },
    });
  }

  function onStop() {
    stopStorySpeech();
    setSpeaking(false);
  }

  return (
    <section
      className="rounded-3xl border border-orange-400/25 bg-zinc-900/70 p-5 sm:p-6"
      aria-label="Storyteller"
    >
      <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
        Storyteller
      </h2>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
        <div
          className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 ${
            speaking
              ? "border-orange-400 shadow-[0_0_28px_rgba(249,115,22,0.55)]"
              : "border-white/15"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={narrator.src}
            alt={`${narrator.name} storyteller portrait`}
            className={`h-full w-full object-cover ${speaking ? "animate-pulse" : ""}`}
          />
          {speaking ? (
            <span
              className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-orange-400/40"
              aria-hidden
            />
          ) : null}
        </div>

        <div className="min-w-0 text-center sm:text-left">
          <p className="text-lg font-black tracking-tight text-white">
            {narrator.name}
          </p>
          <p className="text-sm text-zinc-400">{narrator.blurb}</p>
          <p className="mt-2">
            <Link
              href="/avatars"
              className="text-xs font-bold uppercase tracking-wide text-orange-300 hover:text-orange-200"
            >
              Change avatar
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2">
        {speaking ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop reading"
            className="w-full max-w-md rounded-2xl border border-rose-300/50 bg-rose-500 py-3.5 text-sm font-black uppercase tracking-wide text-white"
          >
            Stop reading
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onRead()}
            aria-label="Have avatar read the story"
            className="w-full max-w-md rounded-2xl bg-orange-500 py-3.5 text-sm font-black uppercase tracking-wide text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Have avatar read the story
          </button>
        )}
        <p
          role="status"
          aria-live="polite"
          className={`text-center text-xs ${
            error ? "text-amber-200" : speaking ? "font-semibold text-orange-200" : "text-zinc-500"
          }`}
        >
          {error
            ? error
            : speaking
              ? `${narrator.name} is reading…`
              : "Uses a natural voice when configured. Falls back to your device voice otherwise."}
        </p>
      </div>
    </section>
  );
}
