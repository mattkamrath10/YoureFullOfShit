"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AuthNav } from "@/components/auth/AuthNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#020812] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ls-stars absolute inset-0 opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,185,66,0.16),transparent_42%),radial-gradient(ellipse_at_center,rgba(12,42,72,0.35),transparent_58%)]" />
      </div>
      <header className="sticky top-0 z-40 border-b border-amber-400/20 bg-[#020812]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <Image
              src="/last-storyteller-logo.png"
              alt="Last Storyteller"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-xl shadow-[0_0_24px_rgba(245,185,66,0.45)] sm:h-10 sm:w-10"
              priority
            />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate font-serif text-[15px] font-bold tracking-[0.22em] text-amber-100 sm:text-base">
                LAST
              </span>
              <span className="truncate text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-400/90 sm:text-[10px]">
                Storyteller
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/#feed"
              className="rounded-full border border-amber-400/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-amber-400/10"
            >
              Search
            </Link>
            <Link
              href="/my-stories"
              className="rounded-full border border-amber-400/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-amber-400/10"
            >
              My Stories
            </Link>
            <AuthNav />
            <Link
              href="/tell"
              className="rounded-full bg-gradient-to-r from-amber-500 to-orange-400 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black shadow-[0_0_20px_rgba(245,185,66,0.35)] hover:from-amber-400 hover:to-orange-300"
            >
              Tell Your Story
            </Link>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <Link
              href="/#feed"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-amber-300"
              aria-label="Search stories"
            >
              <span className="text-lg" aria-hidden>
                ⌕
              </span>
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-amber-300"
              aria-expanded={menuOpen}
              aria-label="Open menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="flex flex-col gap-1.5" aria-hidden>
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-amber-400/15 bg-[#020812]/95 px-4 py-3 md:hidden">
            <nav className="mx-auto flex max-w-5xl flex-col gap-2">
              <Link
                href="/my-stories"
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100"
              >
                My Stories
              </Link>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                <AuthNav />
              </div>
              <Link
                href="/tell"
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-black"
              >
                Tell Your Story
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="relative mx-auto max-w-3xl px-4 pb-16 pt-6 sm:max-w-4xl sm:px-6 lg:max-w-5xl">
        {children}
      </main>
    </div>
  );
}
