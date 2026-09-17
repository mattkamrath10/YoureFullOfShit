"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePlusUsage } from "@/components/plus/PlusUsageProvider";
import { plusNavAppearance } from "@/lib/plus/usage";

export function PlusNavControl({
  layout,
  onNavigate,
}: {
  layout: "desktop" | "mobile-bar" | "mobile-menu";
  onNavigate?: () => void;
}) {
  const { isSignedIn } = useAuth();
  const { usage } = usePlusUsage();
  const appearance = plusNavAppearance({
    isSignedIn,
    hasPlus: Boolean(usage?.has_plus),
  });

  if (appearance === "hidden") return null;

  if (appearance === "plus-member") {
    const className =
      layout === "mobile-menu"
        ? "rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-amber-100"
        : layout === "mobile-bar"
          ? "rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-100"
          : "rounded-full border border-amber-400/40 bg-amber-500/15 px-3.5 py-1.5 text-xs font-black uppercase tracking-wide text-amber-100";
    return (
      <Link href="/plus" onClick={onNavigate} className={className} aria-label="Plus Member">
        Plus Member
      </Link>
    );
  }

  const className =
    layout === "mobile-menu"
      ? "rounded-2xl bg-orange-500 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-black"
      : layout === "mobile-bar"
        ? "rounded-full bg-orange-500 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-black"
        : "rounded-full bg-orange-500 px-3.5 py-1.5 text-xs font-black uppercase tracking-wide text-black transition hover:bg-orange-400";

  return (
    <Link href="/plus" onClick={onNavigate} className={className}>
      Get Plus
    </Link>
  );
}
