# Last Storyteller guest vs account vs admin access

| Feature | Guest (signed out / anonymous) | Email account (FREE) | Plus | Admin |
|---------|--------------------------------|----------------------|------|-------|
| Discover / search / categories | Yes | Yes | Yes | Yes |
| Open / read / watch / listen stories | Yes | Yes | Yes | Yes |
| Storyteller (text listen, device avatar) | Yes (local pref) | Yes (profile + local) | Yes | Yes |
| View public comments | Yes | Yes | Yes | Yes |
| Tell Your Story | No — create account | First 2 lifetime submissions | Unlimited publishing | Yes |
| Media ≤ 50 MB (text/images/PDFs/video) | N/A | Yes — Supabase | Yes | Yes |
| Large video > 50 MB (R2) | No | No | 10/UTC month, 1 GB file, 10 GB stored | Same as Plus if entitled |
| Like / Unlike | Prompt | Yes | Yes | Yes |
| Comment | Prompt | Yes | Yes | Yes |
| Report / block / follow | Prompt | Yes | Yes | Yes |
| Share | Yes | Yes | Yes | Yes |
| My Stories | Prompt | Yes | Yes | Yes |
| Stripe Checkout | No | Web only when configured | Manage via portal | — |
| Stripe in iOS/Android WebView | No | No | Store IAP later | — |
| Admin moderation / Plus grants | No | No | No | Yes (`is_admin`) |

Never show raw `42501` / permission denied to users — map to FREE account prompt.
Guest story insert is blocked by `create_pending_story` after the A0 migration.
