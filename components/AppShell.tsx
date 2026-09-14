"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AuthNav } from "@/components/auth/AuthNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#050505] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.14),_transparent_50%)]" />
      <header className="sticky top-0 z-40 border-b border-orange-500/20 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <Image
              src="/yfos-icon.png"
              alt="You're Full of Shit"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-xl shadow-[0_0_24px_rgba(249,115,22,0.45)] sm:h-10 sm:w-10"
              priority
            />
            <p className="truncate text-sm font-black tracking-tight text-white sm:text-base">
              You&apos;re Full{" "}
              <span className="font-serif text-sm font-normal italic text-orange-400 sm:text-base">
                of
              </span>{" "}
              Shit
            </p>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/#feed"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              Search
            </Link>
            <Link
              href="/my-stories"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              My Stories
            </Link>
            <AuthNav />
            <Link
              href="/tell"
              className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-black shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:bg-orange-400"
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
          <div className="border-t border-orange-500/15 bg-[#050505]/95 px-4 py-3 md:hidden">
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
                className="rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-black"
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
