import assert from "node:assert/strict";
import test from "node:test";
import {
  FREE_STORY_SUBMISSIONS,
  PLUS_LARGE_VIDEOS_PER_MONTH,
  PLUS_MAX_STORAGE_BYTES,
  PLUS_MAX_VIDEO_BYTES,
  canCreateStory,
  canUploadFreeMedia,
  canUploadLargeVideo,
  entitlementIsCurrentlyPlus,
  isLargeVideo,
} from "./rules.ts";

test("free user can submit two stories then needs Plus", () => {
  assert.equal(canCreateStory({ storiesSubmittedCount: 0, hasPlus: false }).ok, true);
  assert.equal(canCreateStory({ storiesSubmittedCount: 1, hasPlus: false }).ok, true);
  assert.equal(canCreateStory({ storiesSubmittedCount: 2, hasPlus: false }).ok, false);
  assert.equal(canCreateStory({ storiesSubmittedCount: 2, hasPlus: true }).ok, true);
  assert.equal(FREE_STORY_SUBMISSIONS, 2);
});

test("large video is video over 50 MB", () => {
  assert.equal(isLargeVideo({ mediaType: "video", byteSize: 50 * 1024 * 1024 }), false);
  assert.equal(isLargeVideo({ mediaType: "video", byteSize: 50 * 1024 * 1024 + 1 }), true);
  assert.equal(isLargeVideo({ mediaType: "image", byteSize: 80 * 1024 * 1024 }), false);
});

test("R2 large-video gates", () => {
  const base = {
    hasPlus: true,
    byteSize: 80 * 1024 * 1024,
    largeVideosThisMonth: 0,
    storedBytes: 0,
  };
  assert.equal(canUploadLargeVideo(base).ok, true);
  assert.equal(canUploadLargeVideo({ ...base, hasPlus: false }).code, "plus_required");
  assert.equal(
    canUploadLargeVideo({ ...base, byteSize: PLUS_MAX_VIDEO_BYTES + 1 }).code,
    "video_too_large",
  );
  assert.equal(
    canUploadLargeVideo({ ...base, largeVideosThisMonth: PLUS_LARGE_VIDEOS_PER_MONTH }).code,
    "monthly_large_video_limit",
  );
  assert.equal(
    canUploadLargeVideo({
      ...base,
      storedBytes: PLUS_MAX_STORAGE_BYTES - 1024,
      byteSize: 80 * 1024 * 1024,
    }).code,
    "storage_limit",
  );
  assert.equal(canUploadLargeVideo({ ...base, largeVideosThisMonth: 9 }).ok, true);
  assert.equal(canUploadLargeVideo({ ...base, largeVideosThisMonth: 10 }).ok, false);
});

test("free media cap is 50 MB", () => {
  assert.equal(canUploadFreeMedia(50 * 1024 * 1024), true);
  assert.equal(canUploadFreeMedia(50 * 1024 * 1024 + 1), false);
});

test("canceled-but-unexpired and lifetime are Plus", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  assert.equal(
    entitlementIsCurrentlyPlus({ status: "canceled", expiresAt: future }),
    true,
  );
  assert.equal(
    entitlementIsCurrentlyPlus({ status: "canceled", expiresAt: past }),
    false,
  );
  assert.equal(entitlementIsCurrentlyPlus({ status: "active", expiresAt: null }), true);
  assert.equal(entitlementIsCurrentlyPlus({ status: "revoked", expiresAt: null }), false);
  assert.equal(entitlementIsCurrentlyPlus({ status: "expired", expiresAt: future }), false);
});
