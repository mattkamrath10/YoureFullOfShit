/**
 * Site identity + canonical URL helpers for metadata, sitemap, and OG tags.
 * Prefer NEXT_PUBLIC_SITE_URL in production (e.g. https://yourdomain.com).
 * Never hardcode a live domain in source.
 */

export const SITE_NAME = "You're Full of Shit";

export const SITE_DESCRIPTION =
  "Everybody has a story. Like, comment, and share. Entertainment — not factual verification.";

/**
 * Canonical site origin with no trailing slash.
 * Order: NEXT_PUBLIC_SITE_URL -> VERCEL_URL (https) -> localhost.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) return explicit;
    return `https://${explicit}`;
  }

  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) {
    if (/^https?:\/\//i.test(vercel)) return vercel;
    return `https://${vercel}`;
  }

  return "http://localhost:3000";
}
