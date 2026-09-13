# YFOS Guest Video ≤50MB + access update

Locked social matrix + guest Supabase media (≤50 MB). R2 stays email-only for large videos.

## ACCESS (short)

| | Guests | FREE email account |
|--|--------|--------------------|
| Discover / read / watch / listen / storyteller / text tell | Yes | Yes |
| Video / image / audio ≤ 50 MB | Yes (Supabase only) | Yes (Supabase) |
| Video > 50 MB | No → free account | Yes (R2) |
| Share | Yes (Web Share / clipboard) | Yes |
| View comments | Yes | Yes |
| Like / Comment (post) / Follow | No → prompt | Yes |
| My Stories / Edit / photo add | No → prompt | Yes |
| Report | Keep current (account to submit OK) | Yes |

## Apply on PC

1. Copy `yfos-guest-video50.tar.gz` + `APPLY_YFOS_GUEST_VIDEO50.ps1` into the Next.js app root
2. No new SQL (prior access / story-reports migrations unchanged)
3. `.\APPLY_YFOS_GUEST_VIDEO50.ps1`

## Ships

- `StoryActions` — Share allowed for guests; Like/Follow still require email; Report preserved; Comment scrolls to list (view OK)
- `CommentSection` — guests view comments; post still gated
- `TellStoryForm` — guests attach ≤50 MB via Supabase; >50 MB prompts free account; email keeps R2
- `lib/media.ts` + `lib/submit-story.ts` — client + insert-path reject guest `byte_size` > 50 MB; no R2 for non-email
- `lib/social/share.ts` — no account gate
- `lib/r2/auth.ts` + `/api/r2/upload/create` — email account required for R2 create
- `docs/ACCESS_MATRIX.md`

## Preserved

R2 for signed-in large files, auth, moderation, story reports/edit (already on disk from prior packages).
`ensureUser` anonymous ownership for guest submit still OK.
