"use client";

import { requireEmailUser } from "@/lib/social/auth";

export type ShareStoryArgs = {
  url: string;
  title: string;
  text?: string;
};

export type ShareResult =
  | { method: "web-share" }
  | { method: "clipboard" }
  | { method: "none"; error: string };

/**
 * Prefer Web Share API; fall back to clipboard copy of the URL.
 * Requires a real email account (share is account-gated).
 */
export async function shareStory(args: ShareStoryArgs): Promise<ShareResult> {
  await requireEmailUser();

  const url = args.url.trim();
  const title = args.title.trim() || "You're Full of Shit";
  const text = (args.text ?? title).trim();

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({ title, text, url });
      return { method: "web-share" };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return { method: "none", error: "Share cancelled." };
      }
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return { method: "clipboard" };
    }
  } catch {
    /* fall through */
  }

  return {
    method: "none",
    error: "Sharing is unavailable on this device.",
  };
}
