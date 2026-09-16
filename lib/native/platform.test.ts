import assert from "node:assert/strict";
import test from "node:test";
import { isNativeShellUserAgent } from "./platform.ts";

test("Capacitor / native UA is blocked from web Stripe", () => {
  assert.equal(isNativeShellUserAgent("Mozilla/5.0 Capacitor/7.0"), true);
  assert.equal(isNativeShellUserAgent("LastStorytellerNative"), true);
  assert.equal(
    isNativeShellUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) LastStorytellerNative"),
    true,
  );
  assert.equal(isNativeShellUserAgent("Mozilla/5.0 Chrome/120"), false);
  assert.equal(
    isNativeShellUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    ),
    false,
  );
});
