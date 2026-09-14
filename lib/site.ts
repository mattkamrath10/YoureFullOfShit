/**
 * Site identity + canonical URL helpers for metadata, sitemap, and OG tags.
 * Prefer NEXT_PUBLIC_SITE_URL in production (no trailing slash).
 */

export const SITE_NAME = "You're Full of Shit";

export const SITE_DESCRIPTION =
  "Everybody has a story. Like, comment, and share. Entertainment — not factual verification.";

// Preserve the correction only for old misspelled Vercel links.
const LEGACY_TYPO_SITE_HOST = "your-full-of-shit.vercel.app";
const LEGACY_CANONICAL_SITE_HOST = "youre-full-of-shit.vercel.app";

export function normalizeSiteOrigin(raw: string): string {
  let value = raw.trim().replace(/\/$/, "");
  if (!value) return value;
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() === LEGACY_TYPO_SITE_HOST) {
      url.hostname = LEGACY_CANONICAL_SITE_HOST;
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

  const render = process.env.RENDER_EXTERNAL_URL?.trim();
  if (render) {
    return normalizeSiteOrigin(render);
  }

  return "http://localhost:3000";
}
