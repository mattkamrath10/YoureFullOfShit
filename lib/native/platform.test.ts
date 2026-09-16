import assert from "node:assert/strict";
import test from "node:test";
import { isNativeShellUserAgent } from "./platform.ts";

test("Capacitor / native UA is blocked from web Stripe", () => {
  assert.equal(isNativeShellUserAgent("Mozilla/5.0 Capacitor/7.0"), true);
  assert.equal(isNativeShellUserAgent("LastStorytellerNative"), true);
  assert.equal(isNativeShellUserAgent("Mozilla/5.0 Chrome/120"), false);
});
