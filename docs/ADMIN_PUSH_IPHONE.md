# Admin phone alerts (iPhone)

YFOS uses Web Push for new pending-story notifications. On iPhone, Web Push is
available in Safari on iOS 16.4 or later only after YFOS is installed as a Home
Screen web app.

## Render environment checklist

Generate a VAPID key pair locally:

```bash
npx web-push generate-vapid-keys
```

In the Render service's environment settings, add these values:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<the generated public key>
VAPID_PRIVATE_KEY=<the generated private key>
VAPID_SUBJECT=mailto:mattkamrath10@gmail.com
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is intentionally exposed to the browser.
`VAPID_PRIVATE_KEY` is a server secret: do not put it in Git, browser code, or
support messages. Deploy after saving the variables. Keep the existing
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` configured because email is used when
an admin has no working phone subscription or a push delivery fails.

## Install and enable on iPhone

1. Update the iPhone to iOS 16.4 or newer.
2. In Safari, visit `https://youre-full-of-shit.onrender.com`.
3. Tap **Share**, choose **Add to Home Screen**, then tap **Add**.
4. Open YFOS using the new Home Screen icon (not the Safari tab).
5. Sign in with an account whose `profiles.is_admin` is true.
6. Open **Admin services** / `/admin/stories`.
7. Tap **Enable phone alerts** and choose **Allow** in Apple's notification
   prompt.

To verify delivery, submit a story so its status is `pending`. Tap the delivered
notification to open the corresponding review URL.

## Disable or troubleshoot

- Use **Disable phone alerts** in `/admin/stories` to remove this device's
  server subscription and browser subscription.
- If permission was denied, re-enable notifications for the installed YFOS web
  app in iOS Settings, then return to `/admin/stories`.
- If the button says the browser is unsupported, confirm that the page was
  launched from the Home Screen icon and not from a Safari tab.
- A 404 or 410 response from a push provider removes that stale device
  subscription automatically; enable it again on that device if needed.
