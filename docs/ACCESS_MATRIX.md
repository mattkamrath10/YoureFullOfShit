# YFOS guest vs account vs admin access

| Feature | Guest (signed out / anonymous) | Email account | Admin |
|---------|--------------------------------|---------------|-------|
| Discover / search / categories | Yes | Yes | Yes |
| Open / read / watch / listen stories | Yes | Yes | Yes |
| Storyteller (text listen, device avatar) | Yes (local pref) | Yes (profile + local) | Yes |
| View public comments | Yes | Yes | Yes |
| Tell Your Story — text + STT | Yes (moderation queue) | Yes | Yes |
| Tell Your Story — video/audio/photo/doc upload | No — prompt / "Sign in to upload video/audio" | Yes (RLS ownership) | Yes |
| Like | Buttons visible; click → FREE account prompt | Yes | Yes |
| Comment (post / delete own) | View only; post → prompt | Yes | Yes |
| Report comment | Prompt | Yes | Yes + moderate |
| Share | Prompt (account required) | Yes | Yes |
| Follow | Prompt | Yes (non-anon authors) | Yes |
| Account / profile / avatar upload | Prompt on /account | Yes | Yes |
| My Stories | Prompt on /my-stories | Yes (own stories) | Yes |
| Notifications (if any) | Account required | Yes | Yes |
| Admin moderation | No | No | Yes |

Never show raw `42501` / permission denied to users — map to FREE account prompt.
