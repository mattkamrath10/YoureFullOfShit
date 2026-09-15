# Last Storyteller guest vs account vs admin access

| Feature | Guest (signed out / anonymous) | Email account (FREE) | Admin |
|---------|--------------------------------|----------------------|-------|
| Discover / search / categories | Yes | Yes | Yes |
| Open / read / watch / listen stories | Yes | Yes | Yes |
| Storyteller (text listen, device avatar) | Yes (local pref) | Yes (profile + local) | Yes |
| View public comments | Yes | Yes | Yes |
| Tell Your Story — text + STT | Yes (moderation queue) | Yes | Yes |
| Tell Your Story — video/image/audio ≤ 50 MB | Yes — **Supabase only** | Yes — Supabase | Yes |
| Tell Your Story — video > 50 MB | No — free account prompt | Yes — **R2** (up to 1 GB) | Yes |
| Like / Unlike | Buttons visible; click → FREE account prompt | Yes | Yes |
| Comment (post / delete own) | View only; post → prompt | Yes | Yes |
| Report comment / story | Prompt (account to submit is fine) | Yes | Yes + moderate |
| Share (Web Share / clipboard) | **Yes** (no sign-in prompt) | Yes | Yes |
| Follow / Unfollow | Prompt | Yes (non-anon authors) | Yes |
| Account / profile / avatar / photo add | Prompt on /account | Yes | Yes |
| My Stories / Edit | Prompt on /my-stories | Yes (own stories) | Yes |
| Admin moderation | No | No | Yes |

Never show raw `42501` / permission denied to users — map to FREE account prompt.
`ensureUser` anonymous sessions remain OK for guest story/media ownership.
