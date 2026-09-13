"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NARRATORS, getNarrator } from "@/lib/narrators";
import {
  loadNarratorAvatarId,
  saveNarratorAvatarId,
} from "@/lib/narrator-pref";

export function NarratorPicker() {
  const [selected, setSelected] = useState(() => getNarrator(null).id);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadNarratorAvatarId().then((id) => {
      if (!cancelled) setSelected(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function choose(id: string) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await saveNarratorAvatarId(id);
      setSelected(result.id);
      const name = getNarrator(result.id).name;
      setStatus(
        result.persisted === "profile"
          ? `${name} is your storyteller.`
          : `${name} is your storyteller on this device.`,
      );
    } catch {
      setError("Could not save your storyteller. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
          Storyteller
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Choose Your Storyteller
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-400">
          Pick who reads text stories aloud. This is not your profile photo —
          it is only the narrator voice and portrait.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {NARRATORS.map((n) => {
          const active = n.id === selected;
          return (
            <button
              key={n.id}
              type="button"
              disabled={busy}
              onClick={() => void choose(n.id)}
              aria-pressed={active}
              aria-label={`Choose ${n.name} as your storyteller`}
              className={`rounded-3xl border p-4 text-left transition disabled:opacity-60 ${
                active
                  ? "border-orange-300 bg-orange-500/15 shadow-[0_0_28px_rgba(249,115,22,0.2)]"
                  : "border-white/10 bg-zinc-900/70 hover:border-white/20 hover:bg-zinc-900"
              }`}
            >
              <div
                className={`mx-auto h-24 w-24 overflow-hidden rounded-full border-2 ${
                  active ? "border-orange-400" : "border-white/15"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={n.src}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-center text-base font-black text-white">
                {n.name}
              </p>
              <p className="mt-1 text-center text-xs text-zinc-400">{n.blurb}</p>
              {active ? (
                <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wide text-orange-300">
                  Selected
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`text-center text-sm ${
          error ? "text-amber-200" : "text-zinc-400"
        }`}
      >
        {error ?? status ?? "Tap a portrait to choose. Maya is the default."}
      </p>

      <p className="text-center text-sm">
        <Link
          href="/"
          className="font-semibold text-orange-300 hover:text-orange-200"
        >
          Back to Discover
        </Link>
      </p>
    </div>
  );
}
