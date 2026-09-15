# Last Storyteller Production Launch Checklist

**Last Storyteller** — Next.js App Router production prep. Public domain: `https://laststoryteller.com` (also account for `www`).

This package does **not** deploy the app and does **not** claim the site is live.
Replace every `YOUR_DOMAIN` / placeholder with your real values locally.
**Never paste secrets, API keys, or service-role keys into chat.**

Recommended hosting: **Render Web Service** via the included `render.yaml` Blueprint. It runs this app with the standard Next.js Node server, preserving Route Handlers, cookie auth SSR, and server-side SDKs.

Brief alternatives:
- **Cloudflare Pages / Workers**: possible with OpenNext adapters, but Next server features (Route Handlers for R2 multipart, cookie auth SSR, Node SDK) are more constrained than a Node web service. Extra adapter work; not the lowest-friction path for this codebase.
- **Self-hosted Node** (Docker / Fly / Railway): fine if you already operate Node; you own TLS, scaling, and env yourself.

---

## A. Preflight (local app on your PC)

- [ ] All prior Last Storyteller / historical YFOS packages applied on the Next.js app root (auth, R2 phase 2, mod-ui, narrator TTS, categories, etc.).
- [ ] `npx tsc --noEmit` and `npm run build` succeed locally.
- [ ] No secrets committed (`.env.local` gitignored).
- [ ] Copy `yfos-production.tar.gz` + `APPLY_YFOS_PRODUCTION.ps1` into the app root; run APPLY (see package README).
- [ ] Confirm additive files landed: `lib/site.ts`, `lib/site-metadata.ts`, `app/sitemap.ts`, `public/robots.txt`, `.env.example`.
- [ ] **[USER ACTION REQUIRED]** Optionally wire OG metadata: in existing `app/layout.tsx`, replace the thin `metadata` export with `buildRootMetadata()` from `@/lib/site-metadata`. Do **not** remove `AuthProvider` / `AppShell`.

---

## B. Choose domain (placeholder)

- [ ] **[USER ACTION REQUIRED]** Pick production hostname: `https://laststoryteller.com` (and `www`).
- [ ] Decide whether apex + www both serve the app and configure the redirect at Render or your DNS provider.
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://laststoryteller.com` (no trailing slash) once known.

---

## C. Render Blueprint setup

- [ ] **[USER ACTION REQUIRED]** Create a Render account/team if needed.
- [ ] **[USER ACTION REQUIRED]** In Render, create a Blueprint from this Git repository and apply `render.yaml`.
- [ ] Confirm the service root is the app root (where `package.json` lives).
- [ ] The Blueprint uses `npm install && npm run build`, `npm run start`, and Node 20.
- [ ] Add every requested environment variable in Render before the first deploy. Values are intentionally not stored in the Blueprint.
- [ ] Do **not** change R2 architecture or the **50 MB** video routing (Supabase Storage for <= 50 MB video path; R2 multipart for larger — leave as implemented).
- [ ] Preview deployments: useful for QA; Production branch typically `main`.

---

## D. Environment variables (Render service -> Environment)

Mark each for Production (and Preview if you want R2/auth to work on previews).

### Public (browser-safe)

| Name | Required | Notes |
|------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key only — **not** service_role |
| `NEXT_PUBLIC_SITE_URL` | Strongly yes | `https://laststoryteller.com` — OG + sitemap |

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
| `SUPABASE_SERVICE_ROLE_KEY` | Required for admin notify | Server-only Supabase service_role key |
| `RESEND_API_KEY` | Required for admin notify | Resend API key |
| `RESEND_FROM_EMAIL` | Required for admin notify | Verified Resend sender, e.g. `Last Storyteller <mattk@laststoryteller.com>` |
| `ADMIN_NOTIFY_EMAIL` | Optional | Comma-separated fallback admin recipients |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Required for admin phone alerts | Browser-visible VAPID public key |
| `VAPID_PRIVATE_KEY` | Required for admin phone alerts | Server-only VAPID private key |
| `VAPID_SUBJECT` | Required for admin phone alerts | `mailto:mattk@laststoryteller.com` |

- [ ] **[USER ACTION REQUIRED]** Copy values from Vercel to Render (or use `.env.local` for local only). Use `.env.example` as the name checklist.
- [ ] Confirm **no** `NEXT_PUBLIC_OPENAI_API_KEY` and **no** Supabase **service_role** in client env.
- [ ] Redeploy after changing env vars.

Set `NEXT_PUBLIC_SITE_URL` explicitly. If it is absent, `getSiteUrl()` falls back to Render's automatic `RENDER_EXTERNAL_URL`; localhost is the final fallback.

---

## E. Supabase Auth URL configuration

Dashboard -> Authentication -> URL Configuration:

- [ ] **Site URL:** `https://laststoryteller.com`
- [ ] **[USER ACTION REQUIRED]** **Redirect URLs allowlist** (add all that apply):
  - `https://laststoryteller.com/**` (or explicit paths below)
  - `https://laststoryteller.com/reset-password`
  - `https://laststoryteller.com/sign-in`
  - `https://laststoryteller.com/create-account`
  - `https://www.laststoryteller.com/**`
  - `https://www.laststoryteller.com/reset-password`
  - `https://www.laststoryteller.com/sign-in`
  - `https://www.laststoryteller.com/create-account`
  - `http://localhost:3000/**`
  - `http://localhost:3000/reset-password`
  - Render preview URLs if used: add their exact origins and redirect paths (tighten to only the environments you use)

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
  "https://laststoryteller.com",
  "https://www.laststoryteller.com"
]
```

Allowed methods: `GET`, `PUT`, `HEAD`. Expose `ETag`. Do **not** use `*` for origins with this upload flow.

- [ ] Optional: lifecycle rule to abort incomplete multipart uploads after 1–7 days.
- [ ] Optional: custom domain for `R2_PUBLIC_URL` — only if you intentionally want public/CDN playback; default path uses **signed GET**.

**50 MB rule (do not change):** videos that fit Supabase object limits can still use Supabase Storage; larger videos use R2 multipart via `/api/r2/upload/*`. Leave routing as implemented.

---

## G. Database migrations (known historical YFOS work)

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

## I. DNS for Render

- [ ] **[USER ACTION REQUIRED]** In Render → service → Settings → Custom Domains, add `laststoryteller.com` and `www.laststoryteller.com`.
- [ ] **[USER ACTION REQUIRED]** At your DNS host, add **exactly** the records Render shows for each hostname. Do not guess targets.

Look for (and copy from the Render UI, not from this checklist):

- Apex (`laststoryteller.com`): A / ALIAS / ANAME / CNAME — **use the exact Render value**
- `www.laststoryteller.com`: CNAME — **use the exact Render value**
- Any TXT / verification records Render displays for domain ownership
- SSL / TLS certificate status in Render after DNS is pointed

- [ ] Wait for TLS certificate issuance from Render.
- [ ] Verify `https://laststoryteller.com` and `https://www.laststoryteller.com` resolve after deploy.

---

## J. SEO / robots / sitemap / metadata (this package)

Additive files (APPLY extracts them):

| Path | Role |
|------|------|
| `public/robots.txt` | Allow public pages; Disallow `/admin`, `/api`, private account routes |
| `app/sitemap.ts` | `/`, `/tell`, `/sign-in`, `/create-account` only (no admin; no dynamic stories) |
| `lib/site.ts` | `SITE_NAME`, `getSiteUrl()` from `NEXT_PUBLIC_SITE_URL` \|\| `RENDER_EXTERNAL_URL` \|\| localhost |
| `lib/site-metadata.ts` | Optional `buildRootMetadata()` for title/description/openGraph |

- [ ] After `NEXT_PUBLIC_SITE_URL` is set, hit `/sitemap.xml` on a deployed URL and confirm origins.
- [ ] Optionally add `Sitemap: https://laststoryteller.com/sitemap.xml` to `robots.txt` once domain is final.
- [ ] Favicon / PWA / OG: official Last Storyteller artwork (`public/last-storyteller-logo.png`, `app/icon.png`, `public/og-share.png`).

---

## K. Build & deploy (you run — agents must not invent credentials)

- [ ] **[USER ACTION REQUIRED]** Merge the production branch, then deploy the Render Blueprint/service from the connected repository.
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

1. **Render:** Roll back to a previous successful deploy from the service's Events/Deploys view, or redeploy the last known-good commit.
2. **DNS:** Usually unchanged; do not flip DNS unless the domain was pointed incorrectly.
3. **Env:** Revert bad env var edits and redeploy.
4. **SQL:** Prefer forward-fix migrations; do not casually drop `is_admin` / `storage_provider` / avatar columns if data exists. Keep a SQL backup/export before risky schema changes.
5. **R2 CORS:** If uploads break after CORS edit, restore prior AllowedOrigins (include localhost + production).
6. **Feature flags (operational):** Temporarily unset `OPENAI_API_KEY` to force browser TTS; R2 unset returns `R2_NOT_CONFIGURED` (large uploads fail closed — small/Supabase path may still work).

---

## Quick reference — auth redirect URLs

```
https://laststoryteller.com
https://laststoryteller.com/reset-password
https://www.laststoryteller.com
https://www.laststoryteller.com/reset-password
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
