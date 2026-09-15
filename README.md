# Last Storyteller

Discover other people's stories and upload your own. Every story deserves to be told.

Production domain: `https://laststoryteller.com` (also account for `www`).
Canonical site URL is read from `NEXT_PUBLIC_SITE_URL`. Primary user-facing email: `mattk@laststoryteller.com`.

This is a Next.js App Router app hosted on Render. Do not rename the existing Render service (`youre-full-of-shit` in `render.yaml`) — that identifier is the live service, not the public brand.

## Access

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

## Local

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill values. Never commit secrets.

## Production cutover (Matthew)

1. Merge this rebrand and wait for the Render deploy of the existing `youre-full-of-shit` service.
2. Set Render env `NEXT_PUBLIC_SITE_URL=https://laststoryteller.com` (no trailing slash).
3. Set `RESEND_FROM_EMAIL` to a verified Last Storyteller sender such as `Last Storyteller <mattk@laststoryteller.com>`.
4. Set `VAPID_SUBJECT=mailto:mattk@laststoryteller.com` if Web Push is enabled.
5. In Supabase Auth URL Configuration, set Site URL and redirects for `https://laststoryteller.com` and `https://www.laststoryteller.com`.
6. In R2 CORS, add those origins (see `docs/R2_CORS.example.json`).
7. In Render → Custom Domains, add apex and www, then copy the **exact** DNS records Render shows. Do not guess A/CNAME targets.
8. Reinstall the iPhone Home Screen app if the old YFOS icon is cached.

See `docs/PRODUCTION_LAUNCH.md` for the full operator checklist.
