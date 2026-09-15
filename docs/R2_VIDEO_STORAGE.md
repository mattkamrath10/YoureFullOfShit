# Last Storyteller — Cloudflare R2 large-video storage

## Why
Supabase Free caps **individual objects at 50 MB**. Client FFmpeg.wasm compress/split was a workaround and is fragile on phones/Turbopack. R2 stores large videos without upgrading Supabase.

## What stays in Supabase
- Auth, profiles, stories, categories, votes, moderation, RLS
- `story_media` **metadata** (and existing Supabase Storage for images/PDFs/small videos)

## What moves to R2
- Large story **video bytes**
- Object key / provider recorded on `story_media`

## Current upload flow
- `lib/r2/*` server modules (`server-only`)
- `/api/r2/upload/{create,complete,abort}` multipart control routes
- `/tell` sends authenticated videos over 50 MB through R2 multipart upload
- `story_media` records the R2 object key with `storage_provider='r2'`
- Images, PDFs, and videos up to 50 MB continue to use Supabase Storage

## Environment variables (server only — never `NEXT_PUBLIC_*`)

| Variable | Purpose |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | Bucket name (e.g. `yfos-story-videos`) |
| `R2_PUBLIC_URL` | Optional public/custom-domain base for playback (no trailing slash) |
| `R2_ENDPOINT` | Optional override; default `https://{accountId}.r2.cloudflarestorage.com` |
| `R2_MAX_VIDEO_BYTES` | Optional app max (default `1073741824` = 1 GiB) |

Put these in `.env.local` / hosting secrets. **Do not commit secrets. Do not paste them in chat.**

## Security model
1. Browser uses existing Supabase session.
2. Browser calls the app API with story id + file meta.
3. Server verifies auth + story ownership + MIME allow-list + size cap.
4. Server starts S3 multipart upload on R2 and returns **presigned part URLs**.
5. Browser PUTs parts **directly to R2** (secrets never leave the server).
6. Browser calls complete, then the app writes `story_media` with `storage_provider='r2'`.

MIME from the client is treated as a claim; server allow-lists types and Content-Type is set on CreateMultipartUpload.

## Multipart / resumable strategy
- AWS S3–compatible **multipart upload** via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- Part size: **8 MiB**
- Create returns all part URLs (1 hour expiry)
- Complete / Abort endpoints for success and cancel
- Supports 100 MB → 500 MB+ (up to `R2_MAX_VIDEO_BYTES`)

Interrupted uploads: client should Abort; enable R2/S3 lifecycle to expire incomplete multipart uploads (see below).

## Object key design
```
stories/{storyId}/{ownerId}/{uuid}/{safeFileName}
```
Collision-safe, story-scoped cleanup, non-guessable uuid segment.

## Playback
- Prefer **private bucket** + **short-lived signed GET** for pending/rejected media (moderation + anonymous stories).
- For published stories, either signed GET or a Cloudflare custom domain in front of R2.
- Require H.264 + AAC MP4 for Safari / Capacitor reliability.
- Progressive MP4 is OK for MVP; Cloudflare Stream/Mux later if ABR needed.

## CORS (configure in Cloudflare R2 bucket settings)
See `docs/R2_CORS.example.json`.
Allow localhost and the deployed production origins listed in `docs/R2_CORS.example.json`. Do **not** use `*` for `AllowedOrigins`; presigned browser PUTs require explicit origins, `PUT`, and an exposed `ETag`. R2 handles `OPTIONS` preflight automatically from the configured policy. `AllowedHeaders: ["*"]` accommodates the browser and S3-compatible request headers without broadening permitted origins.

## Lifecycle / cleanup
| Event | Eventual action |
|---|---|
| Incomplete multipart | Bucket lifecycle abort after 1–7 days |
| User cancels | Call `/api/r2/upload/abort` |
| Submit fails after upload | Delete R2 object; no/orphan `story_media` |
| Story rejected / deleted | Delete R2 objects for that story id prefix |
| Orphans | Periodic job listing `stories/` vs DB keys |
