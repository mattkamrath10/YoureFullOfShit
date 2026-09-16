/**
 * Site identity + canonical URL helpers for metadata, sitemap, and OG tags.
 * Prefer NEXT_PUBLIC_SITE_URL in production (no trailing slash).
 */

export const SITE_NAME = "Last Storyteller";

export const SITE_TAGLINE = "Every story deserves to be told.";

export const SITE_DESCRIPTION =
  "Every story deserves to be told. Discover other people's stories. Upload your own story.";

export const SITE_EMAIL = "mattk@laststoryteller.com";

export function normalizeSiteOrigin(raw: string): string {
  let value = raw.trim().replace(/\/$/, "");
  if (!value) return value;
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const url = new URL(value);
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
