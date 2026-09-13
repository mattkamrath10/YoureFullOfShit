# yfos-production

Production launch prep for You're Full Of Shit (YFOS). Additive only — no R2/50MB redesign, no UI redesign, no deploy from this package.

## Contents

| Path | Purpose |
|------|---------|
| `docs/PRODUCTION_LAUNCH.md` | Full A–N launch checklist |
| `docs/R2_CORS.example.json` | CORS with localhost + `YOUR_DOMAIN` placeholders |
| `.env.example` | All env **names** (empty values / comments) |
| `lib/site.ts` | `SITE_NAME`, `getSiteUrl()` |
| `lib/site-metadata.ts` | Optional `buildRootMetadata()` for OG |
| `app/sitemap.ts` | Public routes sitemap |
| `public/robots.txt` | Allow public; disallow `/admin` `/api` |

## Apply on the PC app root

1. Copy `yfos-production.tar.gz` and `APPLY_YFOS_PRODUCTION.ps1` into the Next.js app root.
2. Run: `.\APPLY_YFOS_PRODUCTION.ps1`
3. Follow `docs/PRODUCTION_LAUNCH.md` (Vercel, env, Supabase redirects, R2 CORS, admin SQL, DNS).
4. Optionally update `app/layout.tsx` metadata to `buildRootMetadata()` — keep AuthProvider/AppShell.

## Hosting

**Vercel** is recommended for Next.js App Router + API routes + server env.
Cloudflare Pages has limits with Next server features; see the launch doc.

This package does **not** make the app live.
