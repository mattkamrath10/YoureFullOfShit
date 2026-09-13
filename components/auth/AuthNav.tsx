"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fetchMyAvatarPath,
  resolveAvatarDisplayUrl,
} from "@/lib/avatar";

export const YFOS_AVATAR_UPDATED = "yfos-avatar-updated";

export function AuthNav() {
  const { loading, isSignedIn, signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    fetchMyAvatarPath(user.id)
      .then((path) => {
        if (!cancelled) setAvatarUrl(resolveAvatarDisplayUrl(path));
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(null);
      });

    function onUpdated(e: Event) {
      const detail = (e as CustomEvent<string | null>).detail;
      setAvatarUrl(detail ?? null);
    }
    window.addEventListener(YFOS_AVATAR_UPDATED, onUpdated as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(
        YFOS_AVATAR_UPDATED,
        onUpdated as EventListener,
      );
    };
  }, [isSignedIn, user?.id]);

  if (loading) {
    return (
      <span className="inline-block h-8 w-8 animate-pulse rounded-full bg-white/5" />
    );
  }

  if (!isSignedIn) {
    return (
      <Link
        href="/sign-in"
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
      >
        Sign In
      </Link>
    );
  }

  async function onSignOut() {
    setBusy(true);
    try {
      await signOut();
      setOpen(false);
      setAvatarUrl(null);
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const label = user?.email?.split("@")[0] ?? "Account";
  const letter = (user?.email?.trim()?.[0] || "?").toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-orange-400/40 bg-black/40">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500/80 to-orange-700/60 text-[11px] font-black text-black">
              {letter}
            </span>
          )}
        </span>
        <span className="hidden sm:inline">Account</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-xl shadow-black/50"
        >
          <p className="truncate border-b border-white/10 px-3 py-2 text-[11px] text-zinc-500">
            {user?.email ?? label}
          </p>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
          >
            Account
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={onSignOut}
            className="block w-full px-3 py-2.5 text-left text-sm text-orange-300 hover:bg-white/5 disabled:opacity-50"
          >
            {busy ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}
