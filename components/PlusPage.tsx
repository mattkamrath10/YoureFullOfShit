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
import {
  IOS_PLUS_NO_WEB_PURCHASE_MESSAGE,
  resolvePlusPurchaseSurface,
} from "@/lib/plus/purchase-surface";

export function PlusPage() {
  const { isSignedIn, loading, user } = useAuth();
  const [native, setNative] = useState(isNativeShellWindow);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const surface = resolvePlusPurchaseSurface({
    loading,
    isSignedIn,
    isNative: native,
    stripeConfigured,
  });

  useEffect(() => {
    const isNative = isNativeShellWindow();
    setNative(isNative);
    if (isNative) {
      setStripeConfigured(false);
      return;
    }
    void fetch("/api/billing/stripe/status")
      .then((r) => r.json())
      .then((body) => {
        if (body.nativeBlocked) {
          setNative(true);
          setStripeConfigured(false);
          return;
        }
        setStripeConfigured(Boolean(body.configured));
      })
      .catch(() => undefined);
  }, []);

  async function startCheckout() {
    if (isNativeShellWindow()) return;
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
    if (isNativeShellWindow()) return;
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
    <div className="mx-auto max-w-4xl space-y-8 text-center md:max-w-5xl md:space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">
          Membership
        </p>
        <h1 className="text-4xl font-black text-white md:text-5xl">Last Storyteller Plus</h1>
        <p className="text-xl font-bold text-amber-300">{PLUS_INTENDED_US_PRICE}</p>
        <p className="text-sm text-zinc-400">
          {native
            ? "Apple will show the localized price before purchase."
            : "Billed monthly through Stripe on laststoryteller.com."}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Tier title="Free" items={FREE_TIER_FEATURES} />
        <Tier title="Last Storyteller Plus" items={PLUS_FEATURES} featured />
      </div>
      {surface === "sign-in" ? (
        <Link
          href="/sign-in"
          className="inline-flex rounded-full bg-orange-500 px-6 py-3 font-black uppercase text-black"
        >
          Sign in to upgrade
        </Link>
      ) : surface === "ios-iap" ? (
        <NativePlusActions userId={user?.id ?? null} busy={busy} setBusy={setBusy} setMessage={setMessage} />
      ) : surface === "web-stripe" ? (
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
      ) : surface === "web-unconfigured" ? (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Stripe Checkout is not configured in this environment.
        </p>
      ) : null}
      {message ? <p className="text-sm text-rose-200">{message}</p> : null}
      <div className="flex justify-center gap-4 text-sm text-zinc-400">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
      </div>
    </div>
  );
}

function NativePlusActions({
  userId,
  busy,
  setBusy,
  setMessage,
}: {
  userId: string | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setMessage: (v: string | null) => void;
}) {
  async function sendToServer(signedTransaction: string) {
    const res = await fetch("/api/billing/apple/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedTransaction }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Apple verification failed.");
  }

  async function buy() {
    if (!userId) {
      setMessage("Sign in with your Last Storyteller account first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const PlusStore = (await import("@/lib/native/plus-store")).default;
      const result = await PlusStore.purchase({ appAccountToken: userId });
      await sendToServer(result.signedTransaction);
      setMessage("Plus is now active on this Last Storyteller account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Purchase failed.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    setMessage(null);
    try {
      const PlusStore = (await import("@/lib/native/plus-store")).default;
      const result = await PlusStore.restore();
      await sendToServer(result.signedTransaction);
      setMessage("Purchases restored.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="max-w-md rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100 md:max-w-xl">
        {IOS_PLUS_NO_WEB_PURCHASE_MESSAGE}
      </p>
      <button
        type="button"
        disabled={busy || !userId}
        onClick={() => void buy()}
        className="rounded-full bg-orange-500 px-6 py-3 font-black uppercase text-black disabled:opacity-40"
      >
        Subscribe with Apple
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void restore()}
        className="text-sm font-semibold text-amber-200"
      >
        Restore Purchases
      </button>
    </div>
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
      className={`rounded-3xl border p-6 text-left md:p-8 ${
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
