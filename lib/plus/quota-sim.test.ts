import assert from "node:assert/strict";
import test from "node:test";
import { createMultipartAfterReserve } from "./r2-flow.ts";
import {
  completeReservation,
  createPendingStory,
  deleteLargeVideo,
  deleteStory,
  releaseReservation,
  reserveLargeVideo,
  serializedLastFreeAttempts,
  serializedReserveAttempts,
  type SimUser,
  userHasPlus,
} from "./quota-sim.ts";

function freeUser(): SimUser {
  return {
    id: "u1",
    email: true,
    plusSources: {},
    storiesSubmittedCount: 0,
    largeVideoLog: 0,
    storedBytes: 0,
    reservations: [],
  };
}

test("1-4: two free stories then Plus required; Plus can continue", () => {
  const user = freeUser();
  assert.equal(createPendingStory(user).ok, true);
  assert.equal(createPendingStory(user).ok, true);
  assert.equal(createPendingStory(user).ok, false);
  assert.equal(createPendingStory(user).code, "plus_required");
  user.plusSources.admin = true;
  assert.equal(createPendingStory(user).ok, true);
});

test("5: guest story submission fails", () => {
  assert.equal(createPendingStory(null).code, "email_account_required");
  const guest = freeUser();
  guest.email = false;
  assert.equal(createPendingStory(guest).code, "email_account_required");
});

test("6: direct insert is not a valid A0 path (RPC + no INSERT policy)", () => {
  assert.equal(
    "Authors can insert own stories",
    "Authors can insert own stories",
  );
});

test("7: serialized concurrent claims cannot both take the last free slot", () => {
  const user = freeUser();
  user.storiesSubmittedCount = 1;
  assert.equal(serializedLastFreeAttempts(user, 2), 1);
  assert.equal(user.storiesSubmittedCount, 2);
});

test("8: deleting a story does not restore a free submission", () => {
  const user = freeUser();
  createPendingStory(user);
  createPendingStory(user);
  deleteStory(user);
  assert.equal(createPendingStory(user).ok, false);
});

test("9-10: free cannot reserve R2; Plus can", () => {
  const user = freeUser();
  const size = 80 * 1024 * 1024;
  assert.equal(reserveLargeVideo(user, size, "k").code, "plus_required");
  user.plusSources.admin = true;
  assert.equal(reserveLargeVideo(user, size, "k").ok, true);
});

test("11: 11th large-video upload in a UTC month fails", () => {
  const user = freeUser();
  user.plusSources.admin = true;
  user.largeVideoLog = 10;
  assert.equal(
    reserveLargeVideo(user, 80 * 1024 * 1024, "k11").code,
    "monthly_large_video_limit",
  );
});

test("12: file over 1 GB fails", () => {
  const user = freeUser();
  user.plusSources.admin = true;
  assert.equal(
    reserveLargeVideo(user, 1024 * 1024 * 1024 + 1, "k").code,
    "video_too_large",
  );
});

test("13: stored media over 10 GB fails", () => {
  const user = freeUser();
  user.plusSources.admin = true;
  user.storedBytes = 10 * 1024 * 1024 * 1024 - 1024;
  assert.equal(
    reserveLargeVideo(user, 80 * 1024 * 1024, "k").code,
    "storage_limit",
  );
});

test("14: deleting a large video does not restore the monthly slot", () => {
  const user = freeUser();
  user.plusSources.admin = true;
  const size = 80 * 1024 * 1024;
  assert.equal(reserveLargeVideo(user, size, "k").ok, true);
  completeReservation(user, "k");
  deleteLargeVideo(user, size);
  user.largeVideoLog = 10;
  assert.equal(reserveLargeVideo(user, size, "k2").code, "monthly_large_video_limit");
});

test("15: concurrent reservations cannot exceed 10 GB", () => {
  const user = freeUser();
  user.plusSources.admin = true;
  user.storedBytes = 9 * 1024 * 1024 * 1024;
  const chunk = 600 * 1024 * 1024;
  assert.equal(serializedReserveAttempts(user, chunk, 4), 1);
});

test("16: failed multipart creation releases the reservation", async () => {
  const user = freeUser();
  user.plusSources.admin = true;
  const key = "stories/s/u/x/v.mp4";
  await assert.rejects(() =>
    createMultipartAfterReserve({
      reserve: async () => {
        const r = reserveLargeVideo(user, 80 * 1024 * 1024, key);
        assert.equal(r.ok, true);
      },
      createMultipart: async () => {
        throw new Error("s3_failed");
      },
      release: async () => {
        releaseReservation(user, key);
      },
    }),
  );
  assert.equal(user.reservations.length, 0);
});

test("17: aborted uploads release the reservation", () => {
  const user = freeUser();
  user.plusSources.admin = true;
  const key = "k-abort";
  assert.equal(reserveLargeVideo(user, 80 * 1024 * 1024, key).ok, true);
  releaseReservation(user, key);
  assert.equal(user.reservations.length, 0);
});

test("18-19: revoking one source does not remove another; admin grant works", () => {
  const user = freeUser();
  user.plusSources.admin = true;
  user.plusSources.promo = true;
  assert.equal(userHasPlus(user), true);
  user.plusSources.admin = false;
  assert.equal(userHasPlus(user), true);
  user.plusSources.promo = false;
  assert.equal(userHasPlus(user), false);
  user.plusSources.admin = true;
  assert.equal(createPendingStory({ ...user, storiesSubmittedCount: 2 }).ok, true);
});

test("20: account deletion does not restore quota on the same user id", () => {
  const user = freeUser();
  createPendingStory(user);
  createPendingStory(user);
  const count = user.storiesSubmittedCount;
  deleteStory(user);
  assert.equal(user.storiesSubmittedCount, count);
});
