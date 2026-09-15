# Last Storyteller Phase 2 — manual configuration required before live large uploads

Code is ready. These steps must be done in Cloudflare + Supabase dashboards (not via chat secrets).

Do **not** recreate or rename the existing R2 bucket. The example name below is historical; keep the live `R2_BUCKET_NAME` already set in Render.

## 1) Cloudflare R2
1. Use the existing **private** R2 bucket. Do not recreate or rename it.
2. Verify its R2 API token has Object Read & Write on that bucket.
3. Note Account ID, Access Key ID, Secret Access Key.
4. Apply `docs/R2_CORS.example.json`. It includes `https://laststoryteller.com` and `https://www.laststoryteller.com`; `OPTIONS` preflights are handled automatically by R2 from this CORS policy.
5. Optional: incomplete multipart lifecycle abort after 7 days.

## 2) Local env (`.env.local` — do not paste values in chat)
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=yfos-story-videos
# optional:
# R2_PUBLIC_URL=https://media.laststoryteller.com
# R2_MAX_VIDEO_BYTES=1073741824
```

## 3) Supabase SQL (apply migration)
In SQL Editor, run the contents of:
`supabase/migrations/20260912_r2_story_media_provider.sql`

This adds `story_media.storage_provider` defaulting existing rows to `supabase`.

## Playback
Story Detail uses **signed GET URLs** for R2 objects (1 hour). Private bucket; pending stories stay non-public.
