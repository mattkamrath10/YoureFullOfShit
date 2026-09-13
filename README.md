# YFOS Access — free public app + account-required community

Guests can discover, read, listen, and submit **text** stories.
Like / Comment / Share / Follow / Report / Account / My Stories need a **FREE** account.

## Database (required)

Run in Supabase SQL Editor **before** testing social writes:

`supabase/migrations/20260914_social_grants_and_guest_access.sql`

This adds table GRANTs for `authenticated` (fixes 42501) and SELECT for `anon` on public social reads.
Does **not** drop tables, disable RLS, or grant anon writes.

## Apply on PC

1. Copy `yfos-access.tar.gz` + `APPLY_YFOS_ACCESS.ps1` into the Next.js app root
2. Paste/run the SQL migration in Supabase
3. `.\APPLY_YFOS_ACCESS.ps1`

## What this package ships

- Social grants migration
- `SignInPrompt` FREE-account copy + Create Free Account / Sign In
- `StoryActions` — Like/Comment/Share/Follow gated; Share does **not** run for guests
- `CommentSection` — guests list comments; write/report → prompt; 42501 → prompt
- `lib/social/{auth,errors,likes,comments,follows,share}.ts`
- `AccountPanel` + `FreeAccountGate` + gated `/my-stories`
- `TellStoryForm` — guests: text+STT OK; media upload blocked with clear message

## Preserved

Discover UI, StoryNarrator compact, R2, media pipeline for signed-in users, admin, auth, narrator `/avatars` local fallback.
