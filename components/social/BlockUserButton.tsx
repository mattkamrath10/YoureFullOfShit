"use client";
import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function BlockUserButton({ userId }: { userId: string }) {
  const { isSignedIn, user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!isSignedIn || user?.id === userId) return;
    fetch(`/api/users/${userId}/block`).then(async (r) => {
      if (r.ok) setBlocked(Boolean((await r.json()).data?.blocked));
    }).catch(() => {});
  }, [isSignedIn, user?.id, userId]);
  if (!isSignedIn || user?.id === userId) return null;
  function toggle() { startTransition(async () => { setError(null); const r = await fetch(`/api/users/${userId}/block`, { method: blocked ? "DELETE" : "POST" }); const json = await r.json().catch(() => ({})); if (!r.ok) setError(json.error?.message || "Could not update block."); else setBlocked(Boolean(json.data?.blocked)); }); }
  return <div className="text-center"><button type="button" onClick={toggle} disabled={pending} className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50">{pending ? "Updating…" : blocked ? "Unblock user" : "Block user"}</button>{error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}</div>;
}
