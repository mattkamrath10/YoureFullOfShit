# App Store privacy data map

Verify these entries against the deployed Supabase, Render, and provider settings before submission.

| Data | Source/purpose | Linked | Tracking | Processor/retention |
|---|---|---:|---:|---|
| Email, account ID, authentication | Account creation and sign-in | Yes | No app tracking | Supabase Auth; removed by account deletion subject to provider logs |
| Display name, avatar | Optional profile display | Yes | No | Supabase; removed by account deletion |
| Stories, comments, reports, likes, follows | UGC, moderation, social features | Yes, including anonymous internal ownership | No | Supabase; authored content deleted by account deletion |
| Photos/documents | User-uploaded story media | Yes | No | Supabase Storage; removed by account deletion |
| Large videos and object metadata | Large-media upload and playback | Yes | No | Cloudflare R2/Supabase; removed by account deletion |
| Story text for narration | Optional text-to-speech | May be linked | No | OpenAI when narration is requested |
| Admin push subscription, user agent | Optional administrator alerts | Yes | No | Supabase/Web Push |
| Operational request data | Security and hosting | Potentially | No app tracking | Render, Supabase, Cloudflare provider logs |

No analytics, advertising, attribution, or cross-app tracking SDK is present in this repository.
