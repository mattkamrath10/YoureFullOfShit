"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  FREE_TIER_FEATURES,
  PLUS_FEATURES,
  PLUS_INTENDED_US_PRICE,
} from "@/lib/subscription";
import { isNativeShellWindow } from "@/lib/native/platform";

export function PlusPage() {
  const { isSignedIn, loading } = useAuth();
  const [native, setNative] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setNative(isNativeShellWindow());
    void fetch("/api/billing/stripe/status")
      .then((r) => r.json())
      .then((body) => {
        setStripeConfigured(Boolean(body.configured) && !body.nativeBlocked);
      })
      .catch(() => undefined);
  }, []);

  async function startCheckout() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/stripe/checkout", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.message ?? body.error ?? "Checkout is not available.");
        return;
      }
      if (typeof body.url === "string") {
        window.location.href = body.url;
        return;
      }
      setMessage("Checkout did not return a URL.");
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/stripe/portal", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.message ?? body.error ?? "Billing portal is not available.");
        return;
      }
      if (typeof body.url === "string") {
        window.location.href = body.url;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 text-center">
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">
          Membership
        </p>
        <h1 className="text-4xl font-black text-white">Last Storyteller Plus</h1>
        <p className="text-xl font-bold text-amber-300">{PLUS_INTENDED_US_PRICE}</p>
        <p className="text-sm text-zinc-400">
          One Plus membership on your Last Storyteller account. Web billing uses Stripe.
          iOS and Android use their store subscriptions when those are configured.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Tier title="Free" items={FREE_TIER_FEATURES} />
        <Tier title="Last Storyteller Plus" items={PLUS_FEATURES} featured />
      </div>
      {loading ? null : !isSignedIn ? (
        <Link
          href="/sign-in"
          className="inline-flex rounded-full bg-orange-500 px-6 py-3 font-black uppercase text-black"
        >
          Sign in
        </Link>
      ) : native ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          In the iOS or Android app, Plus is purchased with the store account on this
          device. Web Stripe Checkout is not offered here. Restore Purchases will be
          available when StoreKit is configured.
        </p>
      ) : stripeConfigured ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout()}
            className="rounded-full bg-orange-500 px-6 py-3 font-black uppercase text-black disabled:opacity-40"
          >
            Subscribe with Stripe
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void openPortal()}
            className="text-sm font-semibold text-amber-200"
          >
            Manage billing
          </button>
        </div>
      ) : (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Stripe Checkout is implemented but not configured in this environment. Plus
          still works from admin/promo grants and from future Apple or Google
          entitlements on this same account.
        </p>
      )}
      {message ? <p className="text-sm text-rose-200">{message}</p> : null}
      <div className="flex justify-center gap-4 text-sm text-zinc-400">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
      </div>
    </main>
  );
}

function Tier({
  title,
  items,
  featured,
}: {
  title: string;
  items: readonly string[];
  featured?: boolean;
}) {
  return (
    <section
      className={`rounded-3xl border p-6 text-left ${
        featured ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-zinc-900/70"
      }`}
    >
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
        {items.map((item) => (
          <li key={item}>✓ {item}</li>
        ))}
      </ul>
    </section>
  );
}
