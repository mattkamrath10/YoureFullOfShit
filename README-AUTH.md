# YFOS Email/Password Auth (phase 1)

## Apply
1. Copy `yfos-auth.tar.gz` + `APPLY_YFOS_AUTH.ps1` into the Next app root.
2. Run `.\APPLY_YFOS_AUTH.ps1`
3. Optional SQL: `supabase/migrations/20260912_auth_profiles_trigger.sql`
4. Supabase Dashboard: Email provider on; redirect allowlist includes `{origin}/reset-password`.

## Routes
`/sign-in` `/create-account` `/forgot-password` `/reset-password` `/account`

## Anonymous
Voting/submit still use `ensureUser()` → anonymous when signed out. Email session preferred when present. Nav treats anonymous as guest.
