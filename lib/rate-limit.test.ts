import assert from "node:assert/strict";
import test from "node:test";
import { rateLimit } from "./rate-limit.ts";

test("rate limit blocks after N hits in a window", () => {
  const key = `t-${Date.now()}`;
  assert.equal(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok, true);
  assert.equal(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok, true);
  assert.equal(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok, false);
});
