# YFOS Production Launch Checklist

**You're Full Of Shit (YFOS)** — Next.js App Router production prep.

This package does **not** deploy the app and does **not** claim the site is live.
Replace every `YOUR_DOMAIN` / placeholder with your real values locally.
**Never paste secrets, API keys, or service-role keys into chat.**

Recommended hosting: **Vercel** (simplest for Next.js App Router + Route Handlers + server env).

Brief alternatives:
- **Cloudflare Pages / Workers**: possible with OpenNext adapters, but Next server features (Route Handlers for R2 multipart, cookie auth SSR, Node SDK) are more constrained than Vercel. Extra adapter work; not the lowest-friction path for this codebase.
- **Self-hosted Node** (Docker / Fly / Railway): fine if you already operate Node; you own TLS, scaling, and env yourself.

---

## A. Preflight (local app on your PC)

- [ ] All prior YFOS packages applied on the Next.js app root (auth, R2 phase 2, mod-ui, narrator TTS, categories, etc.).
- [ ] `npx tsc --noEmit` and `npm run build` succeed locally.
- [ ] No secrets committed (`.env.local` gitignored).
- [ ] Copy `yfos-production.tar.gz` + `APPLY_YFOS_PRODUCTION.ps1` into the app root; run APPLY (see package README).
- [ ] Confirm additive files landed: `lib/site.ts`, `lib/site-metadata.ts`, `app/sitemap.ts`, `public/robots.txt`, `.env.example`.
- [ ] **[USER ACTION REQUIRED]** Optionally wire OG metadata: in existing `app/layout.tsx`, replace the thin `metadata` export with `buildRootMetadata()` from `@/lib/site-metadata`. Do **not** remove `AuthProvider` / `AppShell`.

---

## B. Choose domain (placeholder)

- [ ] **[USER ACTION REQUIRED]** Pick production hostname, e.g. `https://YOUR_DOMAIN` (and optional `www`).
- [ ] Decide whether apex + www both serve the app (Vercel usually redirects one to the other).
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN` (no trailing slash) once known.

---

## C. Vercel project setup

- [ ] **[USER ACTION REQUIRED]** Create a Vercel account/team if needed.
- [ ] **[USER ACTION REQUIRED]** Import the Git repo (or deploy from CLI) as a new Vercel project.
- [ ] Framework Preset: **Next.js**. Root directory: app root (where `package.json` lives).
- [ ] Build command: `next build` (default). Install: `npm install` (or project lockfile default).
- [ ] Node version: match local (18+ / 20 LTS recommended). Set in Project Settings -> General if needed.
- [ ] Do **not** change R2 architecture or the **50 MB** video routing (Supabase Storage for <= 50 MB video path; R2 multipart for larger — leave as implemented).
- [ ] Preview deployments: useful for QA; Production branch typically `main`.

---

## D. Environment variables (Vercel Project Settings -> Environment Variables)

Mark each for Production (and Preview if you want R2/auth to work on previews).

### Public (browser-safe)

| Name | Required | Notes |
|------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key only — **not** service_role |
| `NEXT_PUBLIC_SITE_URL` | Strongly yes | `https://YOUR_DOMAIN` — OG + sitemap |

### Server only (never `NEXT_PUBLIC_`)

| Name | Required | Notes |
|------|----------|--------|
| `R2_ACCOUNT_ID` | Yes for large video | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | Yes for large video | R2 API token |
| `R2_SECRET_ACCESS_KEY` | Yes for large video | R2 API secret |
| `R2_BUCKET_NAME` | Yes for large video | e.g. private `yfos-story-videos` |
| `R2_ENDPOINT` | Optional | Default `https://{accountId}.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | Optional | Custom media domain; signed GET used if unset |
| `R2_MAX_VIDEO_BYTES` | Optional | Default `1073741824` (1 GiB); must be >= 52428800 |
| `OPENAI_API_KEY` | Optional | Narrator TTS; without it, browser voice fallback |
| `OPENAI_TTS_MODEL` | Optional | Default `tts-1-hd` |

- [ ] **[USER ACTION REQUIRED]** Paste values into Vercel (or `.env.local` for local only). Use `.env.example` as the name checklist.
- [ ] Confirm **no** `NEXT_PUBLIC_OPENAI_API_KEY` and **no** Supabase **service_role** in client env.
- [ ] Redeploy after changing env vars.

`VERCEL_URL` is set automatically by Vercel; `getSiteUrl()` falls back to it if `NEXT_PUBLIC_SITE_URL` is missing (prefer setting the public site URL explicitly).

---

## E. Supabase Auth URL configuration

Dashboard -> Authentication -> URL Configuration:

- [ ] **[USER ACTION REQUIRED]** **Site URL:** `https://YOUR_DOMAIN`
- [ ] **[USER ACTION REQUIRED]** **Redirect URLs allowlist** (add all that apply):
  - `https://YOUR_DOMAIN/**` (or explicit paths below)
  - `https://YOUR_DOMAIN/reset-password`
  - `https://YOUR_DOMAIN/sign-in`
  - `https://YOUR_DOMAIN/create-account`
  - `http://localhost:3000/**`
  - `http://localhost:3000/reset-password`
  - Preview URLs if used: `https://*.vercel.app/**` (tighten if your Supabase plan/policy requires exact URLs)

Password reset in app uses:

`redirectTo = ${window.location.origin}/reset-password`

So production origin **must** be allowlisted or reset emails fail.

- [ ] Email provider enabled (Auth -> Providers -> Email).
- [ ] Confirm email templates look OK (optional branding).

---

## F. Cloudflare R2

- [ ] Bucket exists and is **private** (not public listing). Do not redesign; keep current architecture.
- [ ] API token: Object Read & Write scoped to the bucket.
- [ ] **[USER ACTION REQUIRED]** Apply CORS from `docs/R2_CORS.example.json` in this package (or prior R2 package). **Add production origins** alongside localhost:

```json
"AllowedOrigins": [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://YOUR_DOMAIN",
  "https://www.YOUR_DOMAIN"
]
```

Allowed methods: `GET`, `PUT`, `HEAD`. Expose `ETag`. Do **not** use `*` for origins with this upload flow.

- [ ] Optional: lifecycle rule to abort incomplete multipart uploads after 1–7 days.
- [ ] Optional: custom domain for `R2_PUBLIC_URL` — only if you intentionally want public/CDN playback; default path uses **signed GET**.

**50 MB rule (do not change):** videos that fit Supabase object limits can still use Supabase Storage; larger videos use R2 multipart via `/api/r2/upload/*`. Leave routing as implemented.

---

## G. Database migrations (known YFOS work)

Apply in Supabase SQL Editor if not already applied (order matters for dependencies). Mark each as done on your project:

| # | Source | File / script | Purpose |
|---|--------|---------------|---------|
| 1 | yfos-mvp | `supabase/migrations/20260912_init.sql` | Core schema |
| 2 | yfos-tell | `TELL_PHASE.sql` / `supabase-tell-phase.sql` | Tell / submit phase |
| 3 | yfos-media | `MEDIA_READ.sql` | Media read policies / helpers |
| 4 | yfos-videolimit / video50 | `VIDEO_LIMIT.sql` / `VIDEO_50MB.sql` | Video size / 50 MB related SQL |
| 5 | yfos-mod | `MODERATION.sql` | `profiles.is_admin`, story status, RLS, anti self-promote |
| 6 | yfos-auth | `supabase/migrations/20260912_auth_profiles_trigger.sql` | Profile row on new auth user |
| 7 | yfos-account-ui | `supabase/migrations/20260912_profile_avatar.sql` | `avatar_url`, `avatars` bucket + policies |
| 8 | yfos-narrator | `supabase/migrations/20260912_narrator_avatar.sql` | `narrator_avatar_id` |
| 9 | yfos-categories | `supabase/migrations/20260912_rebalance_categories.sql` | Categories rebalance |
| 10 | yfos-r2-phase1/2 | `supabase/migrations/20260912_r2_story_media_provider.sql` | `story_media.storage_provider` (R2 vs supabase) |
| — | yfos-camera (optional) | `CATEGORIES_EXPAND.sql` | Earlier expand; superseded/complemented by rebalance |

- [ ] **[USER ACTION REQUIRED]** Verify each migration already applied or run missing ones.
- [ ] Confirm Storage buckets: story media (as designed) + `avatars` (public read, owner write).

---

## H. Admin promotion (`profiles.is_admin`)

Admin UI (`/admin/stories`) gates via **`profiles.is_admin`** / `requireAdmin()` — **do not hardcode emails in the app.**

- [ ] **[USER ACTION REQUIRED]** Create/sign in with your admin account on production (or promote after first login).
- [ ] **[USER ACTION REQUIRED]** In Supabase SQL Editor, promote by email (replace placeholders):

```sql
-- [USER ACTION REQUIRED] Replace YOUR_ADMIN_EMAIL — do not commit real email into the Next.js app
update public.profiles
set is_admin = true
where id = (
  select id from auth.users where email = 'YOUR_ADMIN_EMAIL' limit 1
);
```

Or by known UUID:

```sql
update public.profiles set is_admin = true where id = 'YOUR_AUTH_USER_UUID';
```

- [ ] Confirm non-admin users cannot open `/admin/stories` or change `is_admin` (DB trigger from moderation).

---

## I. DNS for Vercel

- [ ] **[USER ACTION REQUIRED]** In Vercel -> Project -> Settings -> Domains, add `YOUR_DOMAIN` (and `www` if desired).
- [ ] **[USER ACTION REQUIRED]** At your DNS host, add the records Vercel shows (typical):

| Type | Name | Value (example — use Vercel's exact values) |
|------|------|-----------------------------------------------|
| A | `@` | `76.76.21.21` (Vercel apex IP — confirm in dashboard) |
| CNAME | `www` | `cname.vercel-dns.com` (confirm in dashboard) |

Or CNAME flattening / ALIAS if your DNS supports it for apex.

- [ ] Wait for TLS certificate issuance (Vercel automatic).
- [ ] Verify `https://YOUR_DOMAIN` resolves (after you deploy — this checklist does not deploy for you).

---

## J. SEO / robots / sitemap / metadata (this package)

Additive files (APPLY extracts them):

| Path | Role |
|------|------|
| `public/robots.txt` | Allow public pages; Disallow `/admin`, `/api`, private account routes |
| `app/sitemap.ts` | `/`, `/tell`, `/sign-in`, `/create-account` only (no admin; no dynamic stories) |
| `lib/site.ts` | `SITE_NAME`, `getSiteUrl()` from `NEXT_PUBLIC_SITE_URL` \|\| `VERCEL_URL` \|\| localhost |
| `lib/site-metadata.ts` | Optional `buildRootMetadata()` for title/description/openGraph |

- [ ] After `NEXT_PUBLIC_SITE_URL` is set, hit `/sitemap.xml` on a deployed URL and confirm origins.
- [ ] Optionally add `Sitemap: https://YOUR_DOMAIN/sitemap.xml` to `robots.txt` once domain is final.
- [ ] Favicon: existing `/yfos-icon.png` (already referenced in auth-era layout).

---

## K. Build & deploy (you run — agents must not invent credentials)

- [ ] **[USER ACTION REQUIRED]** Merge production-prep branch; push to the branch Vercel watches **or** `vercel --prod` from your machine with your login.
- [ ] Watch build logs for env / TypeScript errors.
- [ ] This document does **not** mean the app is live until you complete deploy + DNS.

---

## L. Post-deploy testing checklist

- [ ] Home `/` loads; Discover feed works.
- [ ] `/tell` submit text story (anonymous + signed-in).
- [ ] Sign-up / sign-in / sign-out; `/account` avatar if enabled.
- [ ] Forgot password email -> `/reset-password` on **production** origin.
- [ ] Vote Believe / Maybe / You're Full of Shit.
- [ ] Image/PDF/small video (<= 50 MB path) upload still works via Supabase Storage.
- [ ] Large video (> 50 MB) R2 multipart: create -> PUT parts -> complete; playback via signed URL.
- [ ] Narrator TTS: with `OPENAI_API_KEY` -> audio; without -> browser fallback.
- [ ] `/admin/stories` visible only when `is_admin`; approve/reject updates status.
- [ ] `robots.txt` and `/sitemap.xml` reachable.
- [ ] No R2 / OpenAI secrets visible in client bundle (View Source / Network: only `NEXT_PUBLIC_*`).

---

## M. Security notes

- Anon key is public by design; **RLS** must stay correct.
- Never expose Supabase **service_role** to the browser or `NEXT_PUBLIC_*`.
- R2 secrets and `OPENAI_API_KEY` are server-only.
- Admin is DB-backed (`is_admin`), not an email allowlist in React.
- Keep R2 bucket private; prefer signed GET for playback.
- CORS origins must be explicit (localhost + production), not `*`.
- Disallow crawling `/admin` and `/api` in robots (not a security boundary — still enforce auth/RLS).

---

## N. Rollback

If a production deploy misbehaves:

1. **Vercel:** Promote previous Deployment (Deployments -> ... -> Promote to Production) or redeploy last known-good commit.
2. **DNS:** Usually unchanged; do not flip DNS unless the domain was pointed incorrectly.
3. **Env:** Revert bad env var edits and redeploy.
4. **SQL:** Prefer forward-fix migrations; do not casually drop `is_admin` / `storage_provider` / avatar columns if data exists. Keep a SQL backup/export before risky schema changes.
5. **R2 CORS:** If uploads break after CORS edit, restore prior AllowedOrigins (include localhost + production).
6. **Feature flags (operational):** Temporarily unset `OPENAI_API_KEY` to force browser TTS; R2 unset returns `R2_NOT_CONFIGURED` (large uploads fail closed — small/Supabase path may still work).

---

## Quick reference — auth redirect URLs

```
https://YOUR_DOMAIN
https://YOUR_DOMAIN/reset-password
http://localhost:3000
http://localhost:3000/reset-password
```

## Quick reference — admin SQL

```sql
update public.profiles
set is_admin = true
where id = (
  select id from auth.users where email = 'YOUR_ADMIN_EMAIL' limit 1
);
```

---

*End of checklist. Completing A–N prepares launch; deployment remains a user action.*
