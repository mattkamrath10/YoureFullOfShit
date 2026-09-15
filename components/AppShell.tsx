"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AuthNav } from "@/components/auth/AuthNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#030914] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,_rgba(180,83,9,0.14),_transparent_34%),radial-gradient(ellipse_at_50%_38%,_rgba(11,32,66,0.34),_transparent_48%)]" />
      <header className="sticky top-0 z-40 border-b border-amber-400/20 bg-[#040812]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <Image
              src="/last-storyteller-logo.png"
              alt="Last Storyteller"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-xl shadow-[0_0_24px_rgba(249,115,22,0.45)]"
              priority
            />
            <p className="truncate font-serif text-sm font-bold uppercase tracking-[0.18em] text-amber-100 sm:text-base">
              Last <span className="text-amber-400">Storyteller</span>
            </p>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/#feed"
              className="rounded-full border border-amber-400/20 bg-white/[0.035] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-amber-300/45 hover:bg-white/[0.08]"
            >
              Search
            </Link>
            <Link
              href="/my-stories"
              className="rounded-full border border-amber-400/20 bg-white/[0.035] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-amber-300/45 hover:bg-white/[0.08]"
            >
              My Stories
            </Link>
            <AuthNav />
            <Link
              href="/tell"
              className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition hover:-translate-y-px hover:from-amber-400 hover:to-orange-400"
            >
              Tell Your Story
            </Link>
          </nav>

          {/* Mobile: search + menu */}
          <div className="flex items-center gap-1 md:hidden">
            <Link
              href="/#feed"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-orange-400"
              aria-label="Search stories"
            >
              <span className="text-lg" aria-hidden>
                ⌕
              </span>
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-orange-400"
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
          <div className="border-t border-orange-500/15 bg-[#040812]/95 px-4 py-3 md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-2">
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
                className="rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-black"
              >
                Tell Your Story
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="relative mx-auto max-w-3xl px-4 pb-16 pt-5 sm:max-w-5xl sm:px-6 lg:max-w-6xl">
        {children}
      </main>
    </div>
  );
}
