export type PlusUsage = {
  authenticated: boolean;
  stories_submitted_count: number;
  has_plus: boolean;
  plus_expires_at: string | null;
  plus_lifetime: boolean;
  large_videos_this_month: number;
  storage_bytes: number;
  free_story_limit: number;
  large_videos_per_month: number;
  max_storage_bytes: number;
  max_video_bytes: number;
};

export function remainingFreeStories(usage: PlusUsage): number {
  if (usage.has_plus) return 0;
  return Math.max(0, usage.free_story_limit - usage.stories_submitted_count);
}

export function canSubmitAnotherStory(usage: PlusUsage): boolean {
  return usage.has_plus || usage.stories_submitted_count < usage.free_story_limit;
}
