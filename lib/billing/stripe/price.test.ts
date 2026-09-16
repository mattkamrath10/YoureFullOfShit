import assert from "node:assert/strict";
import test from "node:test";
import {
  LAST_STORYTELLER_PLUS_STRIPE_TEST_PRICE_ID,
  STRIPE_PRICE_ID_ENV,
  buildStripeCheckoutSessionParams,
  resolveStripePriceId,
} from "./price.ts";

test("Checkout uses the configured Last Storyteller Plus TEST Price ID", () => {
  const priceId = resolveStripePriceId({
    STRIPE_SECRET_KEY: "sk_test_placeholder",
    STRIPE_PRICE_ID: "",
  });
  assert.equal(priceId, "price_1UGFeWFNZZkempXKf2gMcxn6");
  assert.equal(priceId, LAST_STORYTELLER_PLUS_STRIPE_TEST_PRICE_ID);

  const params = buildStripeCheckoutSessionParams({
    customerId: "cus_test",
    userId: "user-1",
    origin: "https://laststoryteller.com",
    priceId,
  });
  assert.equal(params.mode, "subscription");
  assert.equal(params.line_items[0]?.price, "price_1UGFeWFNZZkempXKf2gMcxn6");
  assert.equal(params.line_items.length, 1);
  assert.equal(STRIPE_PRICE_ID_ENV, "STRIPE_PRICE_ID");
});

test("explicit STRIPE_PRICE_ID wins over the TEST fallback", () => {
  assert.equal(
    resolveStripePriceId({
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      STRIPE_PRICE_ID: "price_other",
    }),
    "price_other",
  );
});

test("live Stripe secret requires an explicit Price ID", () => {
  assert.throws(
    () =>
      resolveStripePriceId({
        STRIPE_SECRET_KEY: "sk_live_placeholder",
        STRIPE_PRICE_ID: "",
      }),
    /STRIPE_NOT_CONFIGURED/,
  );
});
