import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Public static routes only.
 * Skips /admin, /api, account/auth recovery, and dynamic /story/[id].
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const paths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/tell", priority: 0.8, changeFrequency: "weekly" },
    { path: "/sign-in", priority: 0.5, changeFrequency: "monthly" },
    { path: "/create-account", priority: 0.5, changeFrequency: "monthly" },
  ];

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
