import assert from "node:assert/strict";
import test from "node:test";
import {
  IOS_PLUS_NO_WEB_PURCHASE_MESSAGE,
  resolvePlusPurchaseSurface,
} from "./purchase-surface.ts";

test("website signed-in users get Stripe Checkout when configured", () => {
  assert.equal(
    resolvePlusPurchaseSurface({
      loading: false,
      isSignedIn: true,
      isNative: false,
      stripeConfigured: true,
    }),
    "web-stripe",
  );
});

test("iOS native shell never selects Stripe even if Stripe is configured", () => {
  assert.equal(
    resolvePlusPurchaseSurface({
      loading: false,
      isSignedIn: true,
      isNative: true,
      stripeConfigured: true,
    }),
    "ios-iap",
  );
});

test("iOS copy forbids web purchase and does not mention Stripe", () => {
  assert.equal(
    IOS_PLUS_NO_WEB_PURCHASE_MESSAGE,
    "Purchases and Restore Purchases will be available through the iOS app. No web purchase is processed.",
  );
  assert.equal(/stripe/i.test(IOS_PLUS_NO_WEB_PURCHASE_MESSAGE), false);
});
