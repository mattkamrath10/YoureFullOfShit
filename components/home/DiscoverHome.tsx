"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StoryCard } from "@/components/StoryCard";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { HOME_CAROUSEL_RESET_EVENT } from "@/lib/home-navigation";
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
  const [carouselResetVersion, setCarouselResetVersion] = useState(0);

  useEffect(() => {
    const resetHome = () => {
      setFilter("most-recent");
      setQuery("");
      setCarouselResetVersion((version) => version + 1);
    };
    window.addEventListener(HOME_CAROUSEL_RESET_EVENT, resetHome);
    return () => window.removeEventListener(HOME_CAROUSEL_RESET_EVENT, resetHome);
  }, []);

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
      <section className="home-hero relative -mx-4 overflow-hidden px-4 pb-2 text-center sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
        <div className="relative mx-auto max-w-4xl lg:max-w-5xl">
          <div className="hero-artwork mx-auto w-full max-w-[34rem] md:max-w-[42rem]">
            <div className="hero-artwork__atmosphere" aria-hidden />
            <Image
              src="/last-storyteller-book.png"
              alt="Last Storyteller open book and story path"
              width={1024}
              height={1024}
              sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 767px) 34rem, 42rem"
              priority
              className="relative z-10 block h-auto w-full object-contain"
            />
            <div className="hero-artwork__glow" aria-hidden />
          </div>

          <div className="mt-4 space-y-4 sm:mt-5">
            <Link
              href="/tell"
              className="inline-flex min-h-14 w-full max-w-xl items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-orange-400 px-7 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(249,115,22,0.32),0_0_42px_rgba(249,115,22,0.22)] transition duration-200 hover:-translate-y-0.5 hover:from-amber-300 hover:via-orange-400 hover:to-orange-300 sm:px-9 sm:text-base"
            >
              <span aria-hidden>✎</span>
              Tell Your Story
              <span aria-hidden>›</span>
            </Link>
            <p className="mx-auto max-w-lg text-[10px] font-semibold uppercase leading-relaxed tracking-[0.24em] text-zinc-500 sm:text-xs">
              Or just dive in and see what others are sharing
            </p>
          </div>
        </div>
      </section>

      {/* FILTERS + FEED */}
      <section id="feed" className="mx-auto max-w-5xl space-y-5 sm:space-y-6 md:max-w-6xl xl:max-w-7xl">
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
            className="min-h-14 w-full rounded-full border border-orange-400/35 bg-[#040914]/80 px-6 py-4 text-base text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_30px_rgba(0,0,0,0.18)] placeholder:text-zinc-600 outline-none transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/10"
          />
        </div>

        <CategoryCarousel
          key={carouselResetVersion}
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
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
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
