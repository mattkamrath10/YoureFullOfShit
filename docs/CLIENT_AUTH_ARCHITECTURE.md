# Native client authentication architecture

The web app currently uses Supabase browser clients plus Next cookie-backed server clients. A bundled native client must use Supabase's public URL and anon key only, persist sessions in platform-secure native storage, and send the Supabase access token as `Authorization: Bearer <token>` to Render APIs.

Render APIs must validate that token with Supabase and derive the user from the verified token. They must never trust a client-supplied user ID. Existing server-side cookie authentication remains supported for the web app.

Service-role credentials, R2 credentials, OpenAI, Resend, and future Apple verification credentials remain Render-only. Native session storage, refresh, logout, account switching, and expiry handling must be implemented with the selected Capacitor secure-storage integration before a native client is built.
