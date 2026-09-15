"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { PLUS_FEATURES, PLUS_INTENDED_US_PRICE } from "@/lib/subscription";

export function PlusPage() {
  const { isSignedIn, loading } = useAuth();
  return <main className="mx-auto max-w-4xl space-y-8 text-center">
    <header className="space-y-3"><p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">Membership</p><h1 className="text-4xl font-black text-white">Last Storyteller Plus</h1><p className="text-xl font-bold text-amber-300">{PLUS_INTENDED_US_PRICE}</p><p className="text-sm text-zinc-400">Apple will show the localized price before purchase.</p></header>
    <div className="grid gap-4 md:grid-cols-2">
      <Tier title="Free" items={["Create account", "Browse stories", "Tell stories", "Limited video storage", "Limited uploads"]} />
      <Tier title="Last Storyteller Plus" items={[...PLUS_FEATURES]} featured />
    </div>
    {loading ? null : !isSignedIn ? <Link href="/sign-in" className="inline-flex rounded-full bg-orange-500 px-6 py-3 font-black uppercase text-black">Sign in to upgrade</Link> : <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">Purchases and Restore Purchases will be available through the iOS app. No web purchase is processed.</p>}
    <div className="flex justify-center gap-4 text-sm text-zinc-400"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></div>
  </main>;
}
function Tier({ title, items, featured }: { title: string; items: readonly string[]; featured?: boolean }) { return <section className={`rounded-3xl border p-6 text-left ${featured ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-zinc-900/70"}`}><h2 className="text-2xl font-black text-white">{title}</h2><ul className="mt-4 space-y-2 text-sm text-zinc-300">{items.map((item) => <li key={item}>✓ {item}</li>)}</ul></section>; }
