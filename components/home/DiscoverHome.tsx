"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StoryCard } from "@/components/StoryCard";
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
      {/* HERO */}
      <section className="relative mx-auto max-w-2xl space-y-6 text-center sm:space-y-8">
        <div className="space-y-2 px-1">
          <h1 className="text-balance text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl sm:leading-tight">
            <span className="text-orange-400">Discover</span> other
            people&apos;s stories
            <br className="hidden sm:block" /> and upload your own story.
          </h1>
          <p className="text-sm text-zinc-300 sm:text-base">
            We&apos;ll decide if you&apos;re full of shit.
          </p>
        </div>

        <div className="relative mx-auto w-[min(72vw,280px)] sm:w-[320px]">
          <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-orange-500/20 blur-3xl sm:-inset-10" />
          <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-orange-400 shadow-[0_0_48px_rgba(249,115,22,0.45)] sm:rounded-[2rem] sm:border-[3px]">
            <Image
              src="/yfos-icon.png"
              alt="You're Full of Shit mascot"
              width={640}
              height={640}
              priority
              className="h-auto w-full bg-black"
            />
          </div>
          {/* Decorative keyword chips — visual only */}
          <span className="pointer-events-none absolute -left-2 top-6 rotate-[-18deg] text-[10px] font-black uppercase tracking-wide text-orange-400/90 sm:-left-8 sm:text-xs">
            Real stories
          </span>
          <span className="pointer-events-none absolute -right-1 top-10 rotate-[16deg] text-[10px] font-black uppercase tracking-wide text-orange-400/90 sm:-right-10 sm:text-xs">
            Funny moments
          </span>
          <span className="pointer-events-none absolute -left-1 bottom-16 rotate-[-12deg] text-[10px] font-black uppercase tracking-wide text-orange-400/90 sm:-left-12 sm:text-xs">
            Wild confessions
          </span>
          <span className="pointer-events-none absolute -right-2 bottom-20 rotate-[14deg] text-[10px] font-black uppercase tracking-wide text-orange-400/90 sm:-right-8 sm:text-xs">
            Crazy experiences
          </span>
        </div>

        <div className="space-y-3">
          <Link
            href="/tell"
            className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_36px_rgba(249,115,22,0.55)] transition hover:from-orange-400 hover:to-orange-300 sm:px-8 sm:text-base"
          >
            <span aria-hidden>✎</span>
            Tell Your Story
            <span aria-hidden>›</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-xs">
            Or just dive in and see what others are sharing
          </p>
          <div className="text-orange-400/80" aria-hidden>
            ⌄
          </div>
        </div>
      </section>

      {/* FILTERS + FEED */}
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
            className="w-full rounded-full border border-orange-500/20 bg-black/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-400/50 focus:outline-none"
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => {
            const active = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-wide transition sm:px-4 sm:text-xs ${
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

        <h2 className="pt-1 text-center text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          {filter === "most-recent"
            ? "Most recent"
            : chips.find((c) => c.id === filter)?.label ?? "Stories"}
        </h2>

        {filtered.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 text-center text-sm text-zinc-400">
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
