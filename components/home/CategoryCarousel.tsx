"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type CategoryChip = { id: string; label: string };

function subscribeToReducedMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getReducedMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CategoryCarousel({
  chips,
  activeId,
  onSelect,
}: {
  chips: CategoryChip[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const offsetRef = useRef(0);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    () => false,
  );
  const items = [...chips, ...chips];

  const applyOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track || chips.length === 0) return;
    const loopWidth = track.scrollWidth / 2;
    if (!loopWidth) return;
    offsetRef.current =
      ((offsetRef.current % loopWidth) + loopWidth) % loopWidth;
    track.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
  }, [chips.length]);

  const pause = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const resume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 2200);
  }, []);

  const resumeImmediately = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    setPaused(false);
  }, []);

  const select = useCallback(
    (chip: CategoryChip) => {
      pause();
      onSelect(chip.id);
      resume();
    },
    [onSelect, pause, resume],
  );

  useEffect(() => {
    if (paused || prefersReducedMotion || chips.length < 2) return;
    let frame = 0;
    let previous = performance.now();
    const pixelsPerMillisecond = 0.035;

    const animate = (now: number) => {
      offsetRef.current += (now - previous) * pixelsPerMillisecond;
      previous = now;
      applyOffset();
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [applyOffset, chips.length, paused, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const nudge = useCallback(
    (direction: -1 | 1) => {
      pause();
      const track = trackRef.current;
      const distance = track?.parentElement?.clientWidth ?? 240;
      offsetRef.current += direction * distance * 0.65;
      applyOffset();
      resume();
    },
    [applyOffset, pause, resume],
  );

  return (
    <div
      className="relative -mx-4 overflow-hidden px-4 pb-2 sm:mx-0 sm:px-0"
      onMouseEnter={pause}
      onMouseLeave={resumeImmediately}
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
    >
      <div
        ref={trackRef}
        className="flex w-max gap-2 will-change-transform"
      >
        {items.map((chip, itemIndex) => {
          const active = activeId === chip.id;
          return (
            <button
              key={`${chip.id}-${itemIndex}`}
              type="button"
              onClick={() => select(chip)}
              onFocus={pause}
              onBlur={resume}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-wide transition duration-200 sm:px-5 sm:text-xs md:py-2.5 ${
                active
                  ? "border-orange-300 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.32)]"
                  : "border-amber-200/10 bg-white/[0.025] text-zinc-500 hover:border-orange-400/40 hover:bg-orange-400/5 hover:text-zinc-200"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Show previous categories"
        onClick={() => nudge(-1)}
        className="absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-start bg-gradient-to-r from-[#030914] via-[#030914]/85 to-transparent text-xl text-amber-300 transition hover:text-amber-100 focus:outline-none focus-visible:text-amber-100 sm:w-12"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/35 bg-[#090d16]/90 shadow-lg">
          ‹
        </span>
      </button>
      <button
        type="button"
        aria-label="Show next categories"
        onClick={() => nudge(1)}
        className="absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-end bg-gradient-to-l from-[#030914] via-[#030914]/85 to-transparent text-xl text-amber-300 transition hover:text-amber-100 focus:outline-none focus-visible:text-amber-100 sm:w-12"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/35 bg-[#090d16]/90 shadow-lg">
          ›
        </span>
      </button>
    </div>
  );
}
