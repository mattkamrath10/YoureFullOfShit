import Image from "next/image";
import Link from "next/link";
import { AuthNav } from "@/components/auth/AuthNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#070708] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(16,185,129,0.08),_transparent_50%)]" />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070708]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
          >
            <Image
              src="/yfos-icon.png"
              alt="You're Full of Shit"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl shadow-[0_0_24px_rgba(249,115,22,0.45)]"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-white group-hover:text-orange-300 sm:text-base">
                You&apos;re Full of Shit
              </p>
              <p className="truncate text-[11px] text-zinc-500 sm:text-xs">
                Everybody has a story. You decide what you believe.
              </p>
            </div>
          </Link>

          <nav className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
        </div>
      </header>
      <main className="relative mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
