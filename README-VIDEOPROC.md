# Last Storyteller Free-plan on-device video prep

## Flow
1. File/camera under 50 MB → existing upload unchanged
2. Over 50 MB (up to 1 GB) → FFmpeg.wasm (single-thread) compress toward ~45 MB
3. If still over ~48 MB → size-aware split → multiple story_media videos (sort_order)
4. Original oversized file is never uploaded

## Files
- lib/video-process.ts (new)
- lib/media.ts (message tweak)
- components/TellStoryForm.tsx
- components/StoryDetail.tsx (Part X of N)
- package deps: @ffmpeg/ffmpeg @ffmpeg/util

## Not changed
Camera/VideoRecorder, uploadStoryMedia API, submitStory, moderation, schema, RLS, no COOP/COEP
