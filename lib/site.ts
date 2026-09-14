/**
 * Site identity + canonical URL helpers for metadata, sitemap, and OG tags.
 * Prefer NEXT_PUBLIC_SITE_URL in production (no trailing slash).
 */

export const SITE_NAME = "You're Full of Shit";

export const SITE_DESCRIPTION =
  "Everybody has a story. Like, comment, and share. Entertainment — not factual verification.";

/** Correct Vercel production hostname (note the "e" in youre). */
export const PRODUCTION_SITE_HOST = "youre-full-of-shit.vercel.app";

const TYPO_SITE_HOST = "your-full-of-shit.vercel.app";

export function normalizeSiteOrigin(raw: string): string {
  let value = raw.trim().replace(/\/$/, "");
  if (!value) return value;
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() === TYPO_SITE_HOST) {
      url.hostname = PRODUCTION_SITE_HOST;
    }
    return url.origin.replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit?.trim()) {
    return normalizeSiteOrigin(explicit);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return normalizeSiteOrigin(vercel);
  }

  return "http://localhost:3000";
}
