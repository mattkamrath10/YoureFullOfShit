"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StoryCard } from "@/components/StoryCard";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import type { Category, Story } from "@/types/database";

type FilterId = "most-recent" | string;

export function DiscoverHome({
  stories,
  categories,
}: {
  stories: Story[];
  categories: Category[];
}) {
  const [filter, setFilter] = useState<FilterId>("most-recent");
  const [query, setQuery] = useState("");

  const chips: { id: FilterId; label: string }[] = useMemo(() => {
    const base = [{ id: "most-recent" as const, label: "Most Recent" }];
    const cats = categories.map((c) => ({
      id: c.slug || c.id,
      label: c.name,
    }));
    return [...base, ...cats];
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((s) => {
      if (filter !== "most-recent") {
        const slug = s.categories?.slug;
        const name = s.categories?.name?.toLowerCase();
        const chip = categories.find(
          (c) => c.slug === filter || c.id === filter,
        );
        const matchSlug = slug && slug === filter;
        const matchName =
          chip && name && chip.name.toLowerCase() === name;
        if (!matchSlug && !matchName) return false;
      }
      if (!q) return true;
      const hay = [
        s.title,
        s.preview,
        s.categories?.name ?? "",
        s.is_anonymous
          ? "anonymous"
          : s.profiles?.display_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [stories, filter, query, categories]);

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="relative mx-auto max-w-2xl space-y-6 overflow-hidden text-center sm:space-y-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-20%] top-8 -z-10 h-[420px]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(245,185,66,0.22),transparent_58%)]" />
          <svg
            className="absolute inset-x-0 bottom-0 h-40 w-full text-[#07111f]"
            preserveAspectRatio="none"
            viewBox="0 0 1200 200"
          >
            <path
              d="M0 200 L0 128 L90 96 L180 132 L280 72 L390 118 L500 58 L610 110 L720 44 L830 102 L940 68 L1040 120 L1200 84 L1200 200 Z"
              fill="currentColor"
              opacity="0.92"
            />
            <path
              d="M0 200 L0 156 L140 128 L250 164 L370 112 L490 150 L620 104 L760 146 L900 118 L1040 152 L1200 126 L1200 200 Z"
              fill="#040b16"
            />
          </svg>
        </div>

        <div className="space-y-2 px-1">
          <h1 className="text-balance text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight">
            <span className="text-amber-400">Discover</span> other
            people&apos;s stories
            <br className="hidden sm:block" /> and upload your own story.
          </h1>
          <p className="text-sm text-amber-100/80 sm:text-base">
            Every story deserves to be told.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-3xl overflow-x-clip px-1 sm:px-2">
          <div className="pointer-events-none absolute inset-y-4 left-0 z-10 flex w-[28%] max-w-[9.5rem] flex-col justify-between py-2 sm:inset-y-6 sm:w-[30%] sm:max-w-[11rem] md:max-w-[13rem]">
            <span className="origin-left -rotate-[18deg] self-start text-left text-[11px] font-black uppercase leading-tight tracking-wide text-amber-400 drop-shadow-[0_0_12px_rgba(245,185,66,0.55)] sm:text-sm md:text-base">
              Real stories
            </span>
            <span className="origin-left -rotate-[12deg] self-start text-left text-[11px] font-black uppercase leading-tight tracking-wide text-amber-400 drop-shadow-[0_0_12px_rgba(245,185,66,0.55)] sm:text-sm md:text-base">
              Wild confessions
            </span>
          </div>
          <div className="pointer-events-none absolute inset-y-4 right-0 z-10 flex w-[28%] max-w-[9.5rem] flex-col justify-between py-2 sm:inset-y-6 sm:w-[30%] sm:max-w-[11rem] md:max-w-[13rem]">
            <span className="origin-right rotate-[16deg] self-end text-right text-[11px] font-black uppercase leading-tight tracking-wide text-amber-400 drop-shadow-[0_0_12px_rgba(245,185,66,0.55)] sm:text-sm md:text-base">
              Funny moments
            </span>
            <span className="origin-right rotate-[14deg] self-end text-right text-[11px] font-black uppercase leading-tight tracking-wide text-amber-400 drop-shadow-[0_0_12px_rgba(245,185,66,0.55)] sm:text-sm md:text-base">
              Crazy experiences
            </span>
          </div>

          <div className="relative z-0 mx-auto w-[min(58vw,240px)] sm:w-[280px] md:w-[300px]">
            <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-amber-500/20 blur-3xl sm:-inset-10" />
            <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-amber-400 shadow-[0_0_48px_rgba(245,185,66,0.45)] sm:rounded-[2rem] sm:border-[3px]">
              <Image
                src="/last-storyteller-logo.png"
                alt="Last Storyteller official artwork: an open book and glowing story path"
                width={640}
                height={640}
                priority
                className="h-auto w-full bg-[#020812]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/tell"
            className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-black shadow-[0_0_36px_rgba(245,185,66,0.55)] transition hover:from-amber-400 hover:to-orange-300 sm:px-8 sm:text-base"
          >
            <span aria-hidden>✎</span>
            Tell Your Story
            <span aria-hidden>›</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-xs">
            Or just dive in and see what others are sharing
          </p>
        </div>
      </section>

      <section id="feed" className="space-y-4 sm:space-y-5">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="discover-search">
            Search stories
          </label>
          <input
            id="discover-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories…"
            className="w-full rounded-full border border-amber-400/25 bg-black/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-300/60 focus:outline-none"
          />
        </div>

        <CategoryCarousel
          chips={chips}
          activeId={filter}
          onSelect={setFilter}
        />

        <h2 className="pt-1 text-center text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          {filter === "most-recent"
            ? "Most recent"
            : chips.find((c) => c.id === filter)?.label ?? "Stories"}
        </h2>

        {filtered.length === 0 ? (
          <p className="rounded-3xl border border-amber-400/15 bg-zinc-950/60 p-6 text-center text-sm text-zinc-400">
            {stories.length === 0
              ? "No published stories yet."
              : "No stories match this filter."}
          </p>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {filtered.map((story, i) => (
              <StoryCard
                key={story.id}
                story={story}
                emphasized={filter === "most-recent" && i === 0 && !query}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
