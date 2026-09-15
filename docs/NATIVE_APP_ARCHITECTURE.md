# Native app architecture

```
Bundled native UI
  -> authenticated HTTPS Render APIs
    -> Supabase / Cloudflare R2 / OpenAI / Resend
```

The website remains a dynamic Next.js application on Render. The future Capacitor client must bundle UI assets, not load `laststoryteller.com` with `server.url`.

Render remains authoritative for R2 multipart authorization, R2 completion, moderation, account deletion, notifications, narration, and subscription entitlement writes. The client receives only public configuration and authenticated API responses; it never receives service-role, R2, OpenAI, Resend, or Apple private credentials.

R2 browser/native multipart uploads use server-authorized presigned URLs. Future StoreKit transactions are submitted to Render for Apple verification before `subscription_entitlements` is updated. No native project or StoreKit integration is created in this phase.
