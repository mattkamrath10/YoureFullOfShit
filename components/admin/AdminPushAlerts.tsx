"use client";

import { useEffect, useState } from "react";

type PushStatus = "checking" | "unsupported" | "disabled" | "enabled" | "denied";

type IosNavigator = Navigator & { standalone?: boolean };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as IosNavigator).standalone === true
  );
}

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(base64);
  return Uint8Array.from(
    decoded,
    (character) => character.charCodeAt(0),
  ).buffer as ArrayBuffer;
}

export function AdminPushAlerts() {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [message, setMessage] = useState("");
  const [standalone, setStandalone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    void (async () => {
      // Yield once so status is synchronized from the browser after mount,
      // rather than as a synchronous effect-state update.
      await Promise.resolve();
      if (cancelled) return;
      setStandalone(isStandalone());
      if (!supported) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/admin-push-sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (!cancelled) setStatus(subscription ? "enabled" : "disabled");
    })().catch((error) => {
      console.error("[admin-push] status check failed", error);
      if (!cancelled) {
        setStatus("disabled");
        setMessage("Phone alerts could not be checked. Try enabling again.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!vapidPublicKey) {
      setMessage("Phone alerts are not configured yet. Add the VAPID public key in Render.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "disabled");
        setMessage("Allow notifications in the browser prompt to enable phone alerts.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/admin-push-sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
      });
      const response = await fetch("/api/admin/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(result?.error || "Could not save this phone subscription.");
      }
      setStatus("enabled");
      setMessage("Phone alerts are enabled on this device.");
    } catch (error) {
      console.error("[admin-push] enable failed", error);
      setMessage(
        error instanceof Error ? error.message : "Could not enable phone alerts.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/admin/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Could not remove this phone subscription.");
        await subscription.unsubscribe();
      }
      setStatus("disabled");
      setMessage("Phone alerts are disabled on this device.");
    } catch (error) {
      console.error("[admin-push] disable failed", error);
      setMessage(
        error instanceof Error ? error.message : "Could not disable phone alerts.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-zinc-400">
        Phone alerts need a browser with Web Push support. On iPhone, add YFOS
        to your Home Screen and open it from that icon first.
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-4 text-left">
      <p className="text-sm font-bold text-orange-100">Admin phone alerts</p>
      <p className="mt-1 text-sm text-zinc-300">
        {standalone
          ? "This app is opened from the Home Screen."
          : "For iPhone alerts, use Safari → Share → Add to Home Screen, then open YFOS from its icon."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {status === "enabled" ? (
          <button
            type="button"
            disabled={busy}
            onClick={disable}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-zinc-100 disabled:opacity-50"
          >
            {busy ? "Disabling…" : "Disable phone alerts"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || status === "denied"}
            onClick={enable}
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
          >
            {busy ? "Enabling…" : "Enable phone alerts"}
          </button>
        )}
        {status === "denied" ? (
          <span className="text-sm text-orange-200">
            Notifications are blocked. Re-enable them in this app&apos;s browser settings.
          </span>
        ) : null}
      </div>
      {message ? <p className="mt-3 text-sm text-zinc-200">{message}</p> : null}
    </section>
  );
}
