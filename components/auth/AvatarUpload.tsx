"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  fetchMyAvatarPath,
  resolveAvatarDisplayUrl,
  uploadAvatar,
  validateAvatarFile,
} from "@/lib/avatar";
import { YFOS_AVATAR_UPDATED } from "@/components/auth/AuthNav";

function Placeholder({ letter }: { letter: string }) {
  return (
    <span
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500/80 to-orange-700/60 text-2xl font-black text-black"
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function AvatarUpload({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const letter = (email.trim()[0] || "?").toUpperCase();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyAvatarPath(userId)
      .then((path) => {
        if (cancelled) return;
        setDisplayUrl(resolveAvatarDisplayUrl(path));
      })
      .catch(() => {
        if (!cancelled) setDisplayUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function onFileChange(file: File | null) {
    if (!file) return;
    setError(null);
    const check = validateAvatarFile(file);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    try {
      const { publicUrl } = await uploadAvatar({ userId, file });
      setDisplayUrl(publicUrl);
      window.dispatchEvent(
        new CustomEvent(YFOS_AVATAR_UPDATED, { detail: publicUrl }),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-orange-400/40 bg-black/40 shadow-[0_0_24px_rgba(249,115,22,0.25)]">
        {loading ? (
          <span className="block h-full w-full animate-pulse bg-white/5" />
        ) : displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="Your avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <Placeholder letter={letter} />
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <label
          htmlFor={inputId}
          className={`cursor-pointer rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10 ${
            busy ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {busy ? "Uploading…" : displayUrl ? "Change Avatar" : "Upload Avatar"}
        </label>
        <p className="text-center text-[11px] text-zinc-500">
          JPG, PNG, WEBP, or GIF · max 2 MB
        </p>
        {error ? (
          <p className="text-center text-sm text-orange-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
