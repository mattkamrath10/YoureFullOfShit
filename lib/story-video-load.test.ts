import assert from "node:assert/strict";
import test from "node:test";
import {
  VIDEO_MAX_RETRIES,
  VIDEO_SLOW_MS,
  VIDEO_TIMEOUT_MS,
  shouldAutoRetryVideo,
  storyVideoOverlayKind,
} from "./story-video-load.ts";

test("missing URL is unavailable, not a slow load", () => {
  assert.equal(
    storyVideoOverlayKind({ hasUrl: false, isReady: false, elapsedMs: 25_000 }),
    "missing",
  );
});

test("ready video hides loading overlay even after a long wait", () => {
  assert.equal(
    storyVideoOverlayKind({ hasUrl: true, isReady: true, elapsedMs: 25_000 }),
    "none",
  );
});

test("slow load stays loading until 12s, then timeout at 20s", () => {
  assert.equal(
    storyVideoOverlayKind({ hasUrl: true, isReady: false, elapsedMs: 1_000 }),
    "loading",
  );
  assert.equal(
    storyVideoOverlayKind({ hasUrl: true, isReady: false, elapsedMs: VIDEO_SLOW_MS }),
    "slow",
  );
  assert.equal(
    storyVideoOverlayKind({ hasUrl: true, isReady: false, elapsedMs: VIDEO_TIMEOUT_MS }),
    "timeout",
  );
});

test("auto-retry is capped and stops once ready", () => {
  assert.equal(shouldAutoRetryVideo({ isReady: false, retriesUsed: 0 }), true);
  assert.equal(shouldAutoRetryVideo({ isReady: false, retriesUsed: VIDEO_MAX_RETRIES }), false);
  assert.equal(shouldAutoRetryVideo({ isReady: true, retriesUsed: 0 }), false);
});
