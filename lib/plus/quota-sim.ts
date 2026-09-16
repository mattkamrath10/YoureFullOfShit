/**
 * In-memory model of the A0 SQL rules for unit tests.
 * Integration against live Supabase/R2 is separate.
 */

export type SimUser = {
  id: string;
  email: boolean;
  plusSources: Record<string, boolean>;
  storiesSubmittedCount: number;
  largeVideoLog: number;
  storedBytes: number;
  reservations: Array<{ objectKey: string; byteSize: number; monthSlot: boolean }>;
};

export function userHasPlus(user: SimUser): boolean {
  return Object.values(user.plusSources).some(Boolean);
}

export function createPendingStory(user: SimUser | null): { ok: true } | { ok: false; code: string } {
  if (!user || !user.email) return { ok: false, code: "email_account_required" };
  if (user.storiesSubmittedCount < 2 || userHasPlus(user)) {
    user.storiesSubmittedCount += 1;
    return { ok: true };
  }
  return { ok: false, code: "plus_required" };
}

export function deleteStory(_user: SimUser): void {
  /* deleting a story must not decrement storiesSubmittedCount */
}

export function reserveLargeVideo(
  user: SimUser | null,
  byteSize: number,
  objectKey: string,
): { ok: true } | { ok: false; code: string } {
  if (!user || !user.email) return { ok: false, code: "email_account_required" };
  if (byteSize <= 50 * 1024 * 1024) return { ok: false, code: "not_large_video" };
  if (byteSize > 1024 * 1024 * 1024) return { ok: false, code: "video_too_large" };
  if (!userHasPlus(user)) return { ok: false, code: "plus_required" };
  const reservedBytes = user.reservations.reduce((n, r) => n + r.byteSize, 0);
  const monthSlots =
    user.largeVideoLog + user.reservations.filter((r) => r.monthSlot).length;
  if (monthSlots >= 10) return { ok: false, code: "monthly_large_video_limit" };
  if (user.storedBytes + reservedBytes + byteSize > 10 * 1024 * 1024 * 1024) {
    return { ok: false, code: "storage_limit" };
  }
  user.reservations.push({ objectKey, byteSize, monthSlot: true });
  return { ok: true };
}

export function completeReservation(user: SimUser, objectKey: string): void {
  const idx = user.reservations.findIndex((r) => r.objectKey === objectKey);
  if (idx < 0) throw new Error("reservation_not_found");
  const rec = user.reservations[idx]!;
  user.largeVideoLog += 1;
  user.storedBytes += rec.byteSize;
  user.reservations.splice(idx, 1);
}

export function releaseReservation(user: SimUser, objectKey: string): void {
  user.reservations = user.reservations.filter((r) => r.objectKey !== objectKey);
}

export function deleteLargeVideo(user: SimUser, byteSize: number): void {
  user.storedBytes = Math.max(0, user.storedBytes - byteSize);
}

export async function concurrentCreateLastFree(user: SimUser) {
  const started = { count: user.storiesSubmittedCount };
  const results = await Promise.all([
    Promise.resolve().then(() => {
      const snapshot = started.count;
      if (snapshot < 2 || userHasPlus(user)) {
        if (user.storiesSubmittedCount < 2 || userHasPlus(user)) {
          user.storiesSubmittedCount += 1;
          return true;
        }
      }
      return false;
    }),
    Promise.resolve().then(() => {
      if (user.storiesSubmittedCount < 2 || userHasPlus(user)) {
        user.storiesSubmittedCount += 1;
        return true;
      }
      return false;
    }),
  ]);
  return results.filter(Boolean).length;
}

/** Serialized like SQL `UPDATE … WHERE count < 2 OR plus FOR`-style check. */
export function serializedLastFreeAttempts(user: SimUser, attempts: number): number {
  let ok = 0;
  for (let i = 0; i < attempts; i++) {
    if (createPendingStory(user).ok) ok += 1;
  }
  return ok;
}

export function serializedReserveAttempts(
  user: SimUser,
  byteSize: number,
  n: number,
): number {
  let ok = 0;
  for (let i = 0; i < n; i++) {
    if (reserveLargeVideo(user, byteSize, `k-${i}`).ok) ok += 1;
  }
  return ok;
}
