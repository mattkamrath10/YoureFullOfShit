"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VIDEO_RETRY_DELAY_MS,
  shouldAutoRetryVideo,
  storyVideoOverlayKind,
} from "@/lib/story-video-load";

export function StoryVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const retriesUsedRef = useRef(0);
  const readyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [generation, setGeneration] = useState(0);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current != null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const markReady = useCallback(() => {
    readyRef.current = true;
    clearRetryTimer();
    setIsReady(true);
  }, [clearRetryTimer]);

  const reinitialize = useCallback(() => {
    clearRetryTimer();
    readyRef.current = false;
    setIsReady(false);
    setElapsedMs(0);
    setGeneration((n) => n + 1);
  }, [clearRetryTimer]);

  useEffect(() => {
    const started = Date.now();
    tickTimerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - started);
    }, 250);
    return () => {
      if (tickTimerRef.current != null) window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
      clearRetryTimer();
    };
  }, [generation, clearRetryTimer]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "true");
  }, [generation, src]);

  function onError() {
    if (readyRef.current) return;
    if (!shouldAutoRetryVideo({ isReady: false, retriesUsed: retriesUsedRef.current })) {
      return;
    }
    if (retryTimerRef.current != null) return;
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      retriesUsedRef.current += 1;
      reinitialize();
    }, VIDEO_RETRY_DELAY_MS);
  }

  const overlay = storyVideoOverlayKind({ hasUrl: true, isReady, elapsedMs });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        key={`${src}:${generation}`}
        ref={videoRef}
        src={src}
        controls={overlay === "none"}
        playsInline
        preload="auto"
        className={
          overlay === "none"
            ? "relative z-10 w-full bg-black"
            : "pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0"
        }
        onLoadedData={markReady}
        onCanPlay={markReady}
        onPlaying={markReady}
        onError={onError}
      />

      {overlay !== "none" ? (
        <div className="flex min-h-[13.5rem] flex-col items-center justify-center gap-4 px-6 py-10 text-center sm:min-h-[16rem] md:min-h-[22rem]">
          <span className="story-video-spinner" aria-hidden="true" />
          {overlay === "loading" ? (
            <p className="text-sm font-semibold text-amber-100">Loading your story video...</p>
          ) : null}
          {overlay === "slow" ? (
            <>
              <p className="text-sm font-semibold text-amber-100">Loading your story video...</p>
              <p className="max-w-xs text-xs text-zinc-400">
                This video is taking a little longer to load.
              </p>
            </>
          ) : null}
          {overlay === "timeout" ? (
            <>
              <p className="text-sm font-semibold text-amber-100">
                Video is taking longer than expected.
              </p>
              <button
                type="button"
                onClick={() => {
                  retriesUsedRef.current = 0;
                  reinitialize();
                }}
                className="rounded-full bg-orange-500 px-5 py-2 text-xs font-black uppercase tracking-wide text-black"
              >
                Try Again
              </button>
              <p className="max-w-xs text-xs text-zinc-500">
                If the video doesn't appear, tap Try Again.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
