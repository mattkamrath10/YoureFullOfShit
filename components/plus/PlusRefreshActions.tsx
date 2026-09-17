"use client";

import Link from "next/link";

export function PlusRefreshActions({
  refreshing,
  error,
  onRefresh,
}: {
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/plus"
          className="rounded-full bg-orange-500 px-5 py-2.5 text-center text-sm font-black uppercase tracking-wide text-black"
        >
          Get Plus
        </Link>
        <button
          type="button"
          disabled={refreshing}
          onClick={onRefresh}
          className="rounded-full border border-amber-400/40 bg-white/5 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-amber-100 disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh Subscription"}
        </button>
      </div>
      {error ? (
        <p className="text-center text-sm text-rose-200" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
