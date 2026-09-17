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

/** Cookie/session RPC endpoint. Server uses auth.uid(); never a client-supplied user id. */
export const PLUS_USAGE_ENDPOINT = "/api/me/plus";

export const PLUS_USAGE_REFRESH_ERROR =
  "Could not refresh your Plus membership. Check your connection and try again.";

export type PlusNavAppearance = "hidden" | "get-plus" | "plus-member";

export function plusNavAppearance(args: {
  isSignedIn: boolean;
  hasPlus: boolean;
}): PlusNavAppearance {
  if (!args.isSignedIn) return "hidden";
  return args.hasPlus ? "plus-member" : "get-plus";
}

function asInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Accept only a real RPC payload. Never treat a missing/invalid body as Plus. */
export function parsePlusUsage(data: unknown): PlusUsage | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (typeof row.has_plus !== "boolean") return null;
  return {
    authenticated: row.authenticated !== false,
    stories_submitted_count: asInt(row.stories_submitted_count, 0),
    has_plus: row.has_plus,
    plus_expires_at:
      typeof row.plus_expires_at === "string" ? row.plus_expires_at : null,
    plus_lifetime: row.plus_lifetime === true,
    large_videos_this_month: asInt(row.large_videos_this_month, 0),
    storage_bytes: asInt(row.storage_bytes, 0),
    free_story_limit: asInt(row.free_story_limit, 2),
    large_videos_per_month: asInt(row.large_videos_per_month, 10),
    max_storage_bytes: asInt(row.max_storage_bytes, 10 * 1024 * 1024 * 1024),
    max_video_bytes: asInt(row.max_video_bytes, 1024 * 1024 * 1024),
  };
}

export function applyEntitlementRefreshResult(
  previous: PlusUsage | null,
  result: { ok: true; usage: PlusUsage } | { ok: false },
): PlusUsage | null {
  if (!result.ok) return previous;
  return result.usage;
}

export function createRefreshLock() {
  let inflight: Promise<unknown> | null = null;
  return {
    get busy() {
      return inflight != null;
    },
    run<T>(task: () => Promise<T>): Promise<T> {
      if (inflight) return inflight as Promise<T>;
      const pending = task().finally(() => {
        inflight = null;
      });
      inflight = pending;
      return pending;
    },
  };
}

export function remainingFreeStories(usage: PlusUsage): number {
  if (usage.has_plus) return 0;
  return Math.max(0, usage.free_story_limit - usage.stories_submitted_count);
}

export function canSubmitAnotherStory(usage: PlusUsage): boolean {
  return usage.has_plus || usage.stories_submitted_count < usage.free_story_limit;
}
