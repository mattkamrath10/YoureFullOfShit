import assert from "node:assert/strict";
import test from "node:test";
import { LARGE_VIDEO_THRESHOLD_BYTES } from "./rules.ts";
import {
  applyEntitlementRefreshResult,
  createRefreshLock,
  parsePlusUsage,
  PLUS_USAGE_ENDPOINT,
  plusNavAppearance,
  type PlusUsage,
} from "./usage.ts";
import { largeVideoAllowedByClientEntitlement } from "./entitlement-refresh.ts";

function usage(hasPlus: boolean): PlusUsage {
  return {
    authenticated: true,
    stories_submitted_count: 0,
    has_plus: hasPlus,
    plus_expires_at: null,
    plus_lifetime: false,
    large_videos_this_month: 0,
    storage_bytes: 0,
    free_story_limit: 2,
    large_videos_per_month: 10,
    max_storage_bytes: 10 * 1024 * 1024 * 1024,
    max_video_bytes: 1024 * 1024 * 1024,
  };
}

test("Non-Plus user sees Get Plus", () => {
  assert.equal(plusNavAppearance({ isSignedIn: true, hasPlus: false }), "get-plus");
  assert.equal(plusNavAppearance({ isSignedIn: false, hasPlus: false }), "hidden");
});

test("Plus user sees Plus Member", () => {
  assert.equal(plusNavAppearance({ isSignedIn: true, hasPlus: true }), "plus-member");
});

test("refresh uses the authoritative Plus usage endpoint", () => {
  assert.equal(PLUS_USAGE_ENDPOINT, "/api/me/plus");
});

test("successful refresh from non-Plus to Plus updates shared entitlement state", () => {
  const next = applyEntitlementRefreshResult(usage(false), {
    ok: true,
    usage: usage(true),
  });
  assert.equal(next?.has_plus, true);
  assert.equal(plusNavAppearance({ isSignedIn: true, hasPlus: Boolean(next?.has_plus) }), "plus-member");
});

test("a >50 MB upload blocked by stale client entitlement is allowed after Plus refresh", () => {
  const byteSize = LARGE_VIDEO_THRESHOLD_BYTES + 1;
  assert.equal(largeVideoAllowedByClientEntitlement({ hasPlus: false, byteSize }), false);
  const refreshed = applyEntitlementRefreshResult(usage(false), {
    ok: true,
    usage: usage(true),
  });
  assert.equal(refreshed?.has_plus, true);
  assert.equal(
    largeVideoAllowedByClientEntitlement({ hasPlus: Boolean(refreshed?.has_plus), byteSize }),
    true,
  );
});

test("failed refresh does not falsely grant Plus", () => {
  const previous = usage(false);
  const next = applyEntitlementRefreshResult(previous, { ok: false });
  assert.equal(next?.has_plus, false);
  assert.equal(parsePlusUsage({ has_plus: "yes" }), null);
  assert.equal(parsePlusUsage({}), null);
  assert.equal(parsePlusUsage({ has_plus: true })?.has_plus, true);
});

test("multiple rapid refresh clicks share one in-flight request", async () => {
  const lock = createRefreshLock();
  let started = 0;
  let finished = 0;
  const task = () => {
    started += 1;
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        finished += 1;
        resolve("ok");
      }, 20);
    });
  };
  const first = lock.run(task);
  const second = lock.run(task);
  assert.equal(lock.busy, true);
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(started, 1);
  assert.equal(finished, 1);
  assert.equal(lock.busy, false);
});

test("existing 50 MB restriction remains enforced for a genuinely non-Plus user", () => {
  assert.equal(
    largeVideoAllowedByClientEntitlement({
      hasPlus: false,
      byteSize: LARGE_VIDEO_THRESHOLD_BYTES + 1,
    }),
    false,
  );
  assert.equal(
    largeVideoAllowedByClientEntitlement({
      hasPlus: false,
      byteSize: LARGE_VIDEO_THRESHOLD_BYTES,
    }),
    true,
  );
});

test("server-side Plus authorization is not replaced by a client claim", () => {
  const claimed = parsePlusUsage({ has_plus: true, stories_submitted_count: 99 });
  assert.equal(claimed?.has_plus, true);
  assert.equal(PLUS_USAGE_ENDPOINT, "/api/me/plus");
  assert.equal(
    largeVideoAllowedByClientEntitlement({ hasPlus: false, byteSize: 80 * 1024 * 1024 }),
    false,
  );
});
