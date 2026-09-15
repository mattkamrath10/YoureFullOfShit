# Client/server architecture audit

## Current split
| Area | Classification | Notes |
|---|---|---|
| `app/page.tsx`, story, account, admin pages | Server-rendered UI | Use Next server components and the cookie Supabase client. |
| `components/home/*`, cards, forms, auth panels | Client UI | Reusable presentation/interaction components, but receive server data or call Supabase directly. |
| `app/api/*` | Server API | R2 multipart control, narration, notifications, deletion, admin push. |
| `lib/supabase/server.ts`, `lib/supabase/service.ts`, `lib/r2/*`, admin mail | Server | Cookie/session, service role, R2, OpenAI, Resend. |
| `lib/supabase/client.ts`, social/media UI helpers | Browser client | Uses Supabase public URL and anon key. |

## Existing API surface
- R2: `/api/r2/upload/create`, `/complete`, `/abort`
- Account deletion: `/api/account/delete`
- Story deletion: `/api/stories/delete`
- Narration: `/api/narrate`
- Admin notifications/push: `/api/admin/*`

## Required incremental native-client APIs
Public/read: discover stories, categories, story detail, search.
Authenticated: session/profile, story create/edit, social interactions, reports, blocks, account deletion, current entitlement.
Privileged: moderation, R2 signing/completion, narration, notifications, Apple transaction verification.

## Bundled UI strategy
Do not export the current Next application. It depends on dynamic server pages and route handlers. Extract shared client components and introduce authenticated Render API contracts incrementally; build a separate static Capacitor client only after its routes no longer depend on Next server rendering. The existing website remains a dynamic Next/Render deployment.
