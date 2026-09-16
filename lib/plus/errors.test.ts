import assert from "node:assert/strict";
import test from "node:test";
import { plusErrorMessage } from "./errors.ts";

test("maps SQL exceptions to HTTP codes", () => {
  assert.equal(plusErrorMessage({ message: "plus_required" })?.code, "PLUS_REQUIRED");
  assert.equal(plusErrorMessage({ message: "email_account_required" })?.status, 401);
  assert.equal(plusErrorMessage({ message: "monthly_large_video_limit" })?.code, "MONTHLY_LARGE_VIDEO_LIMIT");
  assert.equal(plusErrorMessage({ message: "video_too_large" })?.code, "VIDEO_TOO_LARGE");
  assert.equal(plusErrorMessage({ message: "storage_limit" })?.status, 403);
  assert.equal(plusErrorMessage({ message: "nope" }), null);
});
