import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/site";

/**
 * Optional root metadata with Open Graph.
 * Merge into existing app/layout.tsx — do NOT replace AuthProvider / AppShell.
 *
 * Example in layout.tsx:
 *   import { buildRootMetadata } from "@/lib/site-metadata";
 *   export const metadata: Metadata = buildRootMetadata();
 */
export function buildRootMetadata(): Metadata {
  const url = getSiteUrl();

  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    metadataBase: new URL(url),
    openGraph: {
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    },
    icons: {
      icon: "/yfos-icon.png",
      apple: "/yfos-icon.png",
    },
  };
}
