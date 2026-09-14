# Admin new-story notifications

## What was implemented
- After a story is successfully submitted into `pending`, the client fire-and-forgets `POST /api/admin/notify-new-story`.
- Server verifies the caller owns the pending story, then emails every `profiles.is_admin` user (Auth email via service role).
- Email via **Resend** (server-only). Failed email never fails submission.
- Dedupe table `admin_story_notifications` (one email attempt claim per story).
- Admin Review Center shows a red pending banner: `N STORIES WAITING FOR REVIEW`.
- Review link: `/admin/stories?story=<id>` (highlights that card when present).

## Push notifications
**Not implemented.** The app has no existing web-push / FCM / OneSignal infrastructure. Building a second push stack was explicitly out of scope. Email is the required channel.

## One-time config (you)
1. Create a Resend account and API key.
2. Verify a sending domain (or use Resend’s test `onboarding@resend.dev` only for sandbox).
3. In Render (and `.env.local`), set **server-only** vars (never `NEXT_PUBLIC_`):
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (e.g. `YFOS Moderation <moderation@yourdomain.com>`)
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → service_role)
   - Optional fallback: `ADMIN_NOTIFY_EMAIL` (comma-separated) if Auth email lookup fails
4. Set `NEXT_PUBLIC_SITE_URL` to the canonical Render URL or custom domain (for example, `https://YOUR-SERVICE.onrender.com`) so Review links are correct.
5. Run the SQL migration in Supabase SQL Editor:
   `supabase/migrations/20260914_admin_story_notifications.sql`
6. Deploy or redeploy the Render service after env vars are saved.

## Smoke test
1. Submit a guest or free-account story → pending queue.
2. Check Resend dashboard / inbox for “New Story Submitted — You're Full of Shit”.
3. Click **Review Story** → admin moderation with that story highlighted.
4. Confirm admin banner pending count.
5. Call the notify API twice for the same id → second should skip as duplicate (no second email).
