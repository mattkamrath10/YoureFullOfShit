"use client";

import { useEffect, useState, useTransition } from "react";

type AdminEntitlement = {
  id: string;
  user_id: string;
  source: string;
  status: string;
  expires_at: string | null;
  created_at?: string;
};

type Snapshot = {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  hasPlus: boolean;
  storiesSubmittedCount: number;
  largeVideosThisMonth: number;
  storageBytes: number;
  entitlements: Array<{
    id?: string;
    source: string;
    status: string;
    expiresAt: string | null;
  }>;
};

export function AdminPlusPanel() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [duration, setDuration] = useState("30d");
  const [customExpires, setCustomExpires] = useState("");
  const [source, setSource] = useState("admin");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminEntitlement[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pending, startTransition] = useTransition();

  function reload() {
    void fetch("/api/admin/plus")
      .then((r) => r.json())
      .then((body) => setRows(body.entitlements ?? []))
      .catch(() => undefined);
  }

  useEffect(() => {
    reload();
  }, []);

  function lookup() {
    setMessage(null);
    startTransition(async () => {
      const params = new URLSearchParams();
      if (email.trim()) params.set("email", email.trim());
      if (userId.trim()) params.set("userId", userId.trim());
      const res = await fetch(`/api/admin/plus?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSnapshot(null);
        setMessage(body.error ?? "Lookup failed.");
        return;
      }
      setSnapshot(body as Snapshot);
    });
  }

  function grant() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/plus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          userId: userId.trim() || undefined,
          duration,
          expiresAt: duration === "custom" ? customExpires : undefined,
          notes,
          source,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.error ?? "Grant failed.");
        return;
      }
      setMessage(`Granted ${body.source} Plus to ${body.userId}.`);
      setNotes("");
      reload();
      lookup();
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const res = await fetch("/api/admin/plus", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entitlementId: id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(body.error ?? "Revoke failed.");
        return;
      }
      reload();
      if (snapshot) lookup();
    });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900/60 p-4">
      <h2 className="text-center text-sm font-black uppercase tracking-wide text-amber-200">
        Last Storyteller Plus grants
      </h2>
      <p className="text-center text-xs text-zinc-400">
        Admin/promo only. Does not create Stripe, Apple, or Google billing records.
        Revoke affects only the selected admin/promo row.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Account email"
          className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Or user UUID"
          className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={lookup}
        className="w-full rounded-2xl border border-white/15 py-2 text-sm font-semibold text-zinc-200"
      >
        Look up usage
      </button>
      {snapshot ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-3 text-left text-sm text-zinc-300">
          <p className="font-semibold text-white">
            {snapshot.email ?? snapshot.userId} · Plus {snapshot.hasPlus ? "yes" : "no"}
          </p>
          <p>Stories submitted: {snapshot.storiesSubmittedCount}</p>
          <p>Large videos this month: {snapshot.largeVideosThisMonth}</p>
          <p>Stored media bytes: {snapshot.storageBytes}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {snapshot.entitlements.map((row) => (
              <li key={`${row.source}-${row.id ?? row.expiresAt}`}>
                {row.source} · {row.status}
                {row.expiresAt ? ` · ${new Date(row.expiresAt).toLocaleDateString()}` : " · lifetime"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          <option value="admin">source = admin</option>
          <option value="promo">source = promo</option>
        </select>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
          <option value="90d">90 days</option>
          <option value="1y">1 year</option>
          <option value="lifetime">Lifetime</option>
          <option value="custom">Custom date</option>
        </select>
      </div>
      {duration === "custom" ? (
        <input
          type="datetime-local"
          value={customExpires}
          onChange={(e) => setCustomExpires(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
      ) : null}
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
      />
      <button
        type="button"
        disabled={pending}
        onClick={grant}
        className="w-full rounded-2xl bg-orange-500 py-2.5 text-sm font-black uppercase text-black disabled:opacity-40"
      >
        Grant Plus
      </button>
      {message ? <p className="text-center text-sm text-amber-100">{message}</p> : null}
      <ul className="space-y-2 text-left text-xs text-zinc-400">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2"
          >
            <span>
              {row.source} · {row.user_id.slice(0, 8)}… · {row.status}
              {row.expires_at ? ` · until ${new Date(row.expires_at).toLocaleDateString()}` : " · lifetime"}
            </span>
            {row.status !== "revoked" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => revoke(row.id)}
                className="rounded-full border border-white/15 px-2 py-1 text-[11px] font-semibold text-zinc-200"
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
