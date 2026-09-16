# Last Storyteller — iOS shell + Codemagic

The iOS app is a **Capacitor WKWebView shell** that loads the hosted site
`https://laststoryteller.com`. Next.js stays on Render. Do not static-export
the web app.

## Identity

| Key | Value |
| --- | --- |
| Bundle ID | `com.laststoryteller.app` (existing App Store Connect app) |
| Apple ID | `6812527848` |
| App name | Last Storyteller |
| Marketing version | `0.1.1` (Codemagic `MARKETING_VERSION`; Capacitor `IOS_MARKETING_VERSION`) |
| Build number | Codemagic `$BUILD_NUMBER` (increments each CI build) |
| Codemagic Apple integration | **Last Storyteller Codemagic** (Key ID `23SVT5PLTJ`). Do not use other apps' integrations. |

The `.p8` private key stays in Codemagic. It is not in this repository.

## Why `ios/` is committed

Codemagic still runs `npx cap add ios` if `ios/App` is missing, then
`npx cap sync ios`, then `node scripts/patch-ios-info.mjs`. Committing `ios/`
after the first generation makes the first build more reliable.

Reproduce on a Mac or in Codemagic:

```bash
npm ci
npx cap add ios
npx cap sync ios
node scripts/patch-ios-info.mjs
cd ios/App && pod install
```

Do not run Xcode on Windows. Codemagic is the macOS builder.

## Plugins

Only:

- `@capacitor/core`
- `@capacitor/ios`
- `@capacitor/splash-screen` (navy launch, avoid white flash)
- `@capacitor/status-bar`
- `@capacitor/browser` (foreign http(s) links)

Camera, mic, and photo pickers stay on **web APIs** (`getUserMedia`, `<input type="file">`) with Info.plist usage strings. No `@capacitor/camera`. No APNs — admin alerts stay Web Push on the website.

## Auth / cookies

Because `server.url` is `https://laststoryteller.com`, the WebView origin is the
production site. Supabase cookies and `/api/*` work the same as Safari.

In Supabase Auth URL configuration, keep:

- Site URL: `https://laststoryteller.com`
- Redirects: `https://laststoryteller.com/**` and `https://laststoryteller.com/reset-password`

You do **not** add `capacitor://localhost` for this architecture.

## Push

Native APNs is **not** in this shell. Admin Web Push remains website-only
(Home Screen / Safari). Do not add APNs unless product requirements change.

## Encryption / export

The native shell uses standard HTTPS/TLS only. `ITSAppUsesNonExemptEncryption`
is set to `false` in Info.plist by `scripts/patch-ios-info.mjs`. Confirm the
same answer in App Store Connect.

## Codemagic dashboard

1. Use workflow **Last Storyteller iOS**.
2. Apple Developer Portal integration must be **Last Storyteller Codemagic**.
3. Confirm App Store distribution signing files exist for `com.laststoryteller.app` (Codemagic can fetch them via that integration).
4. Do **not** put `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, R2 secrets, or the Apple `.p8` in Git. The IPA does not embed server secrets.

## First build goal

Signed IPA uploaded to TestFlight. `submit_to_app_store` is `false`.
Do not submit for App Review from this workflow.
