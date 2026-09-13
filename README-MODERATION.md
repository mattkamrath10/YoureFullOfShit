# Moderation / publishing phase

## What this adds
- `/admin/stories` moderation queue (approve / reject / keep pending)
- `profiles.is_admin` + DB trigger so users cannot self-promote
- `stories.rejection_reason` for author-visible reject notes
- Status change trigger: only admins can publish; authors cannot self-publish
- My Stories clearer PENDING / PUBLISHED / REJECTED copy
- Story detail status banner + rejection note for authors

## Preserved
Camera, media upload, stories / story_media tables, anonymous posting, My Stories, Discover published filter, voting.

## Files
- MODERATION.sql (run in Supabase)
- app/admin/stories/page.tsx
- app/my-stories/page.tsx
- components/ModerationQueue.tsx
- components/ModerationActions.tsx
- components/StoryDetail.tsx
- lib/admin.ts
- lib/stories-admin.ts
- types/database.ts
