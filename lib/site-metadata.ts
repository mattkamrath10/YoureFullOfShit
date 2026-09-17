import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/site";

/** Public 1200x630 image for iMessage, Facebook, Twitter, Slack, etc. */
export const OG_SHARE_PATH = "/og-share.png";

/** Bump when replacing og-share.png so crawlers fetch the new file. */
export const BRAND_ASSET_VERSION = "20260917";

/** Square master brand icon from app/icon.png. */
export const BRAND_ICON_PATH = "/icon";

export function absoluteUrl(path: string): string {
  const base = getSiteUrl().replace(/\/$/, "");
  if (!path) return base;
  return path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function getOgImageUrl(): string {
  return `${absoluteUrl(OG_SHARE_PATH)}?v=${BRAND_ASSET_VERSION}`;
}

function ogImage() {
  return {
    url: getOgImageUrl(),
    secureUrl: getOgImageUrl(),
    width: 1200,
    height: 630,
    type: "image/png" as const,
    alt: SITE_NAME,
  };
}

/**
 * Root metadata with Open Graph + Twitter cards + brand icons.
 * Use in app/layout.tsx: export const metadata = buildRootMetadata();
 */
export function buildRootMetadata(): Metadata {
  const url = getSiteUrl();
  const image = getOgImageUrl();

  return {
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    metadataBase: new URL(url),
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [ogImage()],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [image],
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: BRAND_ICON_PATH, type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        { url: "/apple-icon", sizes: "180x180", type: "image/png" },
      ],
      shortcut: "/icon-192.png",
    },
  };
}

/**
 * Public story share metadata. Only call for published/public stories.
 * Always uses branded OG image (never private/signed media URLs).
 */
export function buildStoryMetadata(args: {
  id: string;
  title: string;
  preview?: string | null;
  body?: string | null;
}): Metadata {
  const title = (args.title || "Story").trim() || "Story";
  const raw =
    (args.preview ?? "").trim() ||
    (args.body ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  const description =
    raw.length > 0
      ? raw.slice(0, 180) + (raw.length > 180 ? "…" : "")
      : SITE_DESCRIPTION;
  const path = `/story/${args.id}`;
  const url = absoluteUrl(path);
  const image = getOgImageUrl();

  return {
    title,
    description,
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "article",
      images: [ogImage()],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}
