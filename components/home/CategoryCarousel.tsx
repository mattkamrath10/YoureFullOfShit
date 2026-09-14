"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CategoryChip = { id: string; label: string };

/**
 * Seamless infinite horizontal category carousel.
 * Duplicates the chip list visually only — clicks always use the real chip id.
 * Full unique pass ≈ 5.5s, then loops.
 */
export function CategoryCarousel({
  chips,
  activeId,
  onSelect,
}: {
  chips: CategoryChip[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pause = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const loop = [...chips, ...chips];

  return (
    <div
      className="relative -mx-1 overflow-hidden px-1"
      onPointerDown={pause}
      onPointerUp={scheduleResume}
      onPointerCancel={scheduleResume}
      onMouseLeave={scheduleResume}
    >
      {/* IMPORTANT: use the plain globals.css class name — do NOT prefix with
          Tailwind motion-safe: (that prevents .animate-yfos-category-marquee
          from matching). Reduced-motion is handled in globals.css. */}
      <div
        className={`flex w-max gap-2 animate-yfos-category-marquee ${
          paused ? "[animation-play-state:paused]" : ""
        }`}
      >
        {loop.map((chip, i) => {
          const active = activeId === chip.id;
          return (
            <button
              key={`${chip.id}-${i}`}
              type="button"
              onClick={() => {
                pause();
                onSelect(chip.id);
                scheduleResume();
              }}
              onFocus={pause}
              onBlur={scheduleResume}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-wide transition sm:px-4 sm:text-xs ${
                active
                  ? "border border-orange-400 bg-orange-500/15 text-white shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                  : "border border-white/10 bg-transparent text-zinc-500 hover:border-orange-400/30 hover:text-zinc-300"
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
