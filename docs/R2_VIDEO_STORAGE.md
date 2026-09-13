# YFOS — Cloudflare R2 video storage (Phase 1)

## Why
Supabase Free caps **individual objects at 50 MB**. Client FFmpeg.wasm compress/split was a workaround and is fragile on phones/Turbopack. R2 stores large videos without upgrading Supabase.

## What stays in Supabase
- Auth, profiles, stories, categories, votes, moderation, RLS
- `story_media` **metadata** (and existing Supabase Storage for images/PDFs/small videos)

## What moves to R2 (Phase 2+)
- Large story **video bytes**
- Object key / provider recorded on `story_media`

## Phase 1 status (this PR/package)
Foundation only:
- `lib/r2/*` server modules (`server-only`)
- API stubs under `/api/r2/upload/{create,complete,abort}`
- SQL migration **file created, not applied**
- Types: optional `storage_provider`
- **Not** wired to `/tell`, VideoRecorder, FFmpeg, or `uploadStoryMedia`

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
2. Browser calls YFOS API with story id + file meta.
3. Server verifies auth + story ownership + MIME allow-list + size cap.
4. Server starts S3 multipart upload on R2 and returns **presigned part URLs**.
5. Browser PUTs parts **directly to R2** (secrets never leave the server).
6. Browser calls complete; Phase 2 will write `story_media` with `storage_provider='r2'`.

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

## Playback recommendation (Phase 2+)
- Prefer **private bucket** + **short-lived signed GET** for pending/rejected media (moderation + anonymous stories).
- For published stories, either signed GET or a Cloudflare custom domain in front of R2.
- Require H.264 + AAC MP4 for Safari / Capacitor reliability.
- Progressive MP4 is OK for MVP; Cloudflare Stream/Mux later if ABR needed.

## CORS (configure in Cloudflare R2 bucket settings)
See `docs/R2_CORS.example.json`.
Allow your localhost origin and future production / Capacitor origins. Do **not** use `*` with credentialed flows; for presigned PUT, AllowedOrigins should list explicit dev/prod origins, AllowedMethods `PUT, GET, HEAD`, AllowedHeaders include `Content-Type`, `Content-Length`, and expose `ETag`.

## Lifecycle / cleanup (design only — not automated in Phase 1)
| Event | Eventual action |
|---|---|
| Incomplete multipart | Bucket lifecycle abort after 1–7 days |
| User cancels | Call `/api/r2/upload/abort` |
| Submit fails after upload | Delete R2 object; no/orphan `story_media` |
| Story rejected / deleted | Delete R2 objects for that story id prefix |
| Orphans | Periodic job listing `stories/` vs DB keys |

## Intended Phase 2
1. Apply `storage_provider` migration when ready.
2. Wire `/tell` large videos → R2 multipart APIs (not Supabase Storage).
3. Insert `story_media` with `storage_provider='r2'`.
4. Story Detail signed/public playback for R2 keys.
5. Keep ≤50 MB path on Supabase **or** send all videos to R2 (product choice).
6. Retire FFmpeg.wasm as the oversized-video gate.

## Intentionally NOT changed in Phase 1
TellStoryForm, VideoRecorder, FFmpeg pipeline, `uploadStoryMedia`, Supabase `story-media` bucket, moderation, auth UX, submission behavior.
