"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { castVote } from "@/lib/votes";
import { percent } from "@/lib/stories-client";
import { CommunityOpinionNote } from "@/components/CommunityOpinionNote";
import type { Verdict, VoteTallies } from "@/types/database";
import { VERDICT_LABELS } from "@/types/database";

const OPTIONS: {
  verdict: Verdict;
  className: string;
  activeClassName: string;
}[] = [
  {
    verdict: "believe",
    className:
      "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
    activeClassName:
      "border-emerald-300 bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.35)]",
  },
  {
    verdict: "maybe",
    className:
      "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
    activeClassName:
      "border-amber-300 bg-amber-400 text-black shadow-[0_0_30px_rgba(251,191,36,0.35)]",
  },
  {
    verdict: "full_of_shit",
    className:
      "border-orange-400/30 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20",
    activeClassName:
      "border-orange-300 bg-orange-500 text-black shadow-[0_0_30px_rgba(249,115,22,0.4)]",
  },
];

function applyOptimistic(
  tallies: VoteTallies,
  prev: Verdict | null,
  next: Verdict,
): VoteTallies {
  const copy: VoteTallies = {
    believe: tallies.believe,
    maybe: tallies.maybe,
    full_of_shit: tallies.full_of_shit,
    total: tallies.total,
  };
  if (prev === next) return copy;
  if (prev) copy[prev] = Math.max(0, copy[prev] - 1);
  else copy.total += 1;
  copy[next] += 1;
  return copy;
}

export function VerdictPanel({
  storyId,
  initialTallies,
  initialMyVote,
}: {
  storyId: string;
  initialTallies: VoteTallies;
  initialMyVote: Verdict | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [myVote, setMyVote] = useState<Verdict | null>(initialMyVote);
  const [tallies, setTallies] = useState(initialTallies);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMyVote(initialMyVote);
    setTallies(initialTallies);
  }, [initialMyVote, initialTallies]);

  const bars = useMemo(
    () =>
      (["believe", "maybe", "full_of_shit"] as Verdict[]).map((v) => ({
        verdict: v,
        count: tallies[v],
        pct: percent(tallies[v], tallies.total),
      })),
    [tallies],
  );

  function onVote(verdict: Verdict) {
    setError(null);
    const prev = myVote;
    const prevTallies = tallies;
    setMyVote(verdict);
    setTallies(applyOptimistic(tallies, prev, verdict));

    startTransition(async () => {
      try {
        await castVote(storyId, verdict);
        router.refresh();
      } catch (e) {
        setMyVote(prev);
        setTallies(prevTallies);
        setError(
          e instanceof Error
            ? e.message
            : "Could not save your verdict. Try again.",
        );
      }
    });
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-4 sm:p-5">
      <h2 className="text-center text-lg font-black tracking-tight text-white sm:text-xl">
        What do you believe?
      </h2>
      <p className="mt-1 text-center text-sm text-zinc-400">
        Pick one. You can change your mind later.
      </p>

      <div className="mt-4 grid gap-3">
        {OPTIONS.map((opt) => {
          const active = myVote === opt.verdict;
          return (
            <button
              key={opt.verdict}
              type="button"
              disabled={pending}
              onClick={() => onVote(opt.verdict)}
              className={`rounded-2xl border px-4 py-3.5 text-center text-sm font-extrabold uppercase tracking-wide transition disabled:opacity-60 sm:text-base ${
                active ? opt.activeClassName : opt.className
              }`}
            >
              {VERDICT_LABELS[opt.verdict]}
              {pending && active ? " ..." : ""}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-200">Community verdict</h3>
          <span className="text-xs text-zinc-500">
            {tallies.total} vote{tallies.total === 1 ? "" : "s"}
          </span>
        </div>
        {bars.map((b) => (
          <div key={b.verdict}>
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>{VERDICT_LABELS[b.verdict]}</span>
              <span>
                {b.pct}% ({b.count})
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  b.verdict === "believe"
                    ? "bg-emerald-400"
                    : b.verdict === "maybe"
                      ? "bg-amber-400"
                      : "bg-orange-500"
                }`}
                style={{ width: `${b.pct}%` }}
              />
            </div>
          </div>
        ))}
        <CommunityOpinionNote />
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
