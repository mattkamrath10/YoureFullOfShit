"use client";

import {
  type TransitionEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    () => false,
  );
  const items = [...chips, ...chips];

  const pause = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const resume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 2200);
  }, []);

  const select = useCallback(
    (chip: CategoryChip, nextIndex: number) => {
      pause();
      onSelect(chip.id);
      const normalizedIndex = nextIndex % chips.length;
      indexRef.current = normalizedIndex;
      setIndex(normalizedIndex);
      resume();
    },
    [chips.length, onSelect, pause, resume],
  );

  useEffect(() => {
    if (paused || prefersReducedMotion || chips.length < 2) return;
    const timer = window.setInterval(() => {
      const nextIndex = indexRef.current + 1;
      indexRef.current = nextIndex;
      onSelect(chips[nextIndex % chips.length]!.id);
      setIndex(nextIndex);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [chips, onSelect, paused, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const item = track?.querySelector<HTMLElement>(`[data-carousel-index="${index}"]`);
    if (!track || !item) return;
    track.style.transform = `translate3d(-${item.offsetLeft}px, 0, 0)`;
  }, [index]);

  const resetLoop = useCallback((event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") {
      return;
    }
    if (index !== chips.length) return;
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = "none";
    track.style.transform = "translate3d(0, 0, 0)";
    window.requestAnimationFrame(() => {
      track.style.transition = "";
      indexRef.current = 0;
      setIndex(0);
    });
  }, [chips.length, index]);

  return (
    <div
      className="relative -mx-4 overflow-hidden px-4 pb-2 sm:mx-0 sm:px-0"
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
      onMouseLeave={resume}
    >
      <div
        ref={trackRef}
        className="flex w-max gap-2 transition-transform duration-700 ease-out motion-reduce:transition-none"
        onTransitionEnd={resetLoop}
      >
        {items.map((chip, itemIndex) => {
          const active = activeId === chip.id;
          return (
            <button
              key={`${chip.id}-${itemIndex}`}
              type="button"
              data-carousel-index={itemIndex}
              onClick={() => select(chip, itemIndex)}
              onFocus={pause}
              onBlur={resume}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-wide transition duration-200 sm:text-xs ${
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
    </div>
  );
}
