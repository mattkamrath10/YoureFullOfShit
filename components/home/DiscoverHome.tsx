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
    <div className="space-y-11 pb-4 sm:space-y-14">
      {/* HERO */}
      <section className="home-hero relative -mx-4 overflow-hidden px-4 pb-2 pt-4 text-center sm:-mx-6 sm:px-6 sm:pt-7 lg:-mx-8 lg:px-8">
        <div className="relative mx-auto max-w-3xl">
          <div className="space-y-2 px-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-orange-300/65 sm:text-xs">
              Every story deserves to be told
            </p>
            <h1 className="text-balance text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
            <span className="text-orange-400">Discover</span> other
            people&apos;s stories
            <br className="hidden sm:block" /> and upload your own story.
            </h1>
          </div>

          <div className="hero-artwork mx-auto mt-5 w-[min(86vw,34rem)] sm:mt-7">
            <div className="hero-artwork__atmosphere" aria-hidden />
            <Image
              src="/last-storyteller-logo.png"
              alt="Last Storyteller open book and story path"
              width={640}
              height={640}
              priority
              className="relative z-10 h-auto w-full"
            />
            <div className="hero-artwork__glow" aria-hidden />
          </div>

          <div className="mt-1 space-y-3 sm:mt-3">
            <Link
              href="/tell"
              className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-orange-400 px-7 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(249,115,22,0.32),0_0_42px_rgba(249,115,22,0.22)] transition duration-200 hover:-translate-y-0.5 hover:from-amber-400 hover:via-orange-400 hover:to-orange-300 sm:px-9 sm:text-base"
            >
              <span aria-hidden>✎</span>
              Tell Your Story
              <span aria-hidden>›</span>
            </Link>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:text-xs">
              Or just dive in and see what others are sharing
            </p>
          </div>
        </div>
      </section>

      {/* FILTERS + FEED */}
      <section id="feed" className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        <div className="relative">
          <label className="sr-only" htmlFor="discover-search">
            Search stories
          </label>
          <input
            id="discover-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories..."
            className="w-full rounded-full border border-orange-400/25 bg-[#040914]/80 px-5 py-3.5 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_30px_rgba(0,0,0,0.18)] placeholder:text-zinc-600 outline-none transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/10"
          />
        </div>

        <CategoryCarousel
          chips={chips}
          activeId={filter}
          onSelect={setFilter}
        />

        <h2 className="pt-2 text-center text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">
          {filter === "most-recent"
            ? "Most recent"
            : chips.find((c) => c.id === filter)?.label ?? "Stories"}
        </h2>

        {filtered.length === 0 ? (
          <p className="rounded-3xl border border-orange-400/15 bg-[#080c15]/85 p-6 text-center text-sm text-zinc-400">
            {stories.length === 0
              ? "No published stories yet."
              : "No stories match this filter."}
          </p>
        ) : (
          <div className="grid gap-4 sm:gap-5">
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
