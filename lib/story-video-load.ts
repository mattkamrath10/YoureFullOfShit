export const VIDEO_SLOW_MS = 12_000;
export const VIDEO_TIMEOUT_MS = 20_000;
export const VIDEO_MAX_RETRIES = 3;
export const VIDEO_RETRY_DELAY_MS = 1_000;

export type StoryVideoOverlayKind = "missing" | "none" | "loading" | "slow" | "timeout";

export function storyVideoOverlayKind(args: {
  hasUrl: boolean;
  isReady: boolean;
  elapsedMs: number;
}): StoryVideoOverlayKind {
  if (!args.hasUrl) return "missing";
  if (args.isReady) return "none";
  if (args.elapsedMs >= VIDEO_TIMEOUT_MS) return "timeout";
  if (args.elapsedMs >= VIDEO_SLOW_MS) return "slow";
  return "loading";
}

export function shouldAutoRetryVideo(args: {
  isReady: boolean;
  retriesUsed: number;
}): boolean {
  if (args.isReady) return false;
  return args.retriesUsed < VIDEO_MAX_RETRIES;
}
