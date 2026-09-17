# Last Storyteller Render / domain cutover

Use this checklist to point production at `https://laststoryteller.com` without changing application behavior.

Keep the existing Render **service name** `youre-full-of-shit`. That is the live service identifier, not the public brand. Do not recreate the service.

1. Deploy this repository to the existing Render Web Service (`render.yaml` service `youre-full-of-shit`).
2. Set `NEXT_PUBLIC_SITE_URL=https://laststoryteller.com` (no trailing slash).
3. Update `RESEND_FROM_EMAIL` to a verified Last Storyteller sender (for example `Last Storyteller <mattk@laststoryteller.com>`).
4. If Web Push is configured, set `VAPID_SUBJECT=mailto:mattk@laststoryteller.com`. Keep existing VAPID keys unless you intend to re-subscribe every admin device.
5. In Supabase Authentication URL Configuration, set Site URL to `https://laststoryteller.com` and add apex + www redirect URLs.
6. In Cloudflare R2 bucket CORS, add `https://laststoryteller.com` and `https://www.laststoryteller.com` to `AllowedOrigins`. Keep localhost origins used for development. Do not recreate the bucket.
7. In Render → Custom Domains, add `laststoryteller.com` and `www.laststoryteller.com`, then copy the **exact** DNS records Render shows (apex A/ALIAS/CNAME, www CNAME, any TXT, then wait for SSL). Do not guess targets from this document.
8. Smoke test the production origin:
   - Sign up, sign in, sign out, and password reset.
   - Submit a story, including a large-video R2 multipart upload if enabled.
   - Confirm R2 playback, OpenAI TTS (or browser fallback), and admin new-story email / push notifications.
   - Check `/robots.txt`, `/sitemap.xml`, and generated review links.
9. After DNS, Supabase redirects, and R2 CORS all point to laststoryteller.com and smoke tests pass, you may leave the old `*.onrender.com` URL as a Render default hostname.

The previous Vercel hosts (`your-full-of-shit.vercel.app` / `youre-full-of-shit.vercel.app`) are historical only. Canonical URLs now come from `NEXT_PUBLIC_SITE_URL`.

Production is **Render**, not Vercel. If GitHub PRs still show a red Vercel check, the old Vercel GitHub App is still installed. Disconnect it:

1. GitHub → repo **Settings** → **Integrations / GitHub Apps** → **Vercel** → Uninstall / Configure → revoke this repo
2. Or Vercel dashboard → project **youre-full-of-shit** → Settings → Git → Disconnect

`vercel.json` in this repo turns off automatic Vercel git deploys so a leftover integration cannot fail PRs.
