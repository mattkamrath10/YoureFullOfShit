import assert from "node:assert/strict";
import test from "node:test";
import { applySourceMutation, userHasPlusFromRows, type EntitlementRow } from "../apply-source.ts";
import { mapStripeEventToMutation, userIdFromStripeObject } from "./map-event.ts";

const adminRow: EntitlementRow = {
  userId: "user-1",
  source: "admin",
  status: "active",
  expiresAt: null,
  productCode: "lst.plus",
  providerCustomerId: null,
  providerSubscriptionId: null,
};

test("checkout maps to stripe grant and does not drop admin", () => {
  const mutation = mapStripeEventToMutation(
    {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_1",
          subscription: "sub_1",
          metadata: { user_id: "user-1" },
          current_period_end: 1_800_000_000,
        },
      },
    },
    "user-1",
  );
  assert.equal("source" in mutation && mutation.source, "stripe");
  if (!("source" in mutation)) throw new Error("expected mutation");
  const next = applySourceMutation([adminRow], mutation);
  assert.equal(next.length, 2);
  assert.equal(next.find((r) => r.source === "admin")?.status, "active");
  assert.equal(next.find((r) => r.source === "stripe")?.providerSubscriptionId, "sub_1");
  assert.equal(userHasPlusFromRows(next), true);
});

test("subscription deleted expires only stripe", () => {
  const stripeRow: EntitlementRow = {
    ...adminRow,
    source: "stripe",
    expiresAt: "2099-01-01T00:00:00.000Z",
    providerSubscriptionId: "sub_1",
    providerCustomerId: "cus_1",
  };
  const mutation = mapStripeEventToMutation(
    {
      id: "evt_2",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          ended_at: 1_700_000_000,
        },
      },
    },
    "user-1",
  );
  if (!("source" in mutation)) throw new Error("expected mutation");
  const next = applySourceMutation([adminRow, stripeRow], mutation);
  assert.equal(next.find((r) => r.source === "stripe")?.status, "expired");
  assert.equal(next.find((r) => r.source === "admin")?.status, "active");
  assert.equal(userHasPlusFromRows(next), true);
});

test("failed payment marks stripe past_due", () => {
  const mutation = mapStripeEventToMutation(
    {
      id: "evt_3",
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1", subscription: "sub_1" } },
    },
    "user-1",
  );
  if (!("source" in mutation)) throw new Error("expected mutation");
  assert.equal(mutation.status, "past_due");
});

test("metadata user_id is required for checkout mapping", () => {
  assert.equal(userIdFromStripeObject({ metadata: { user_id: "abc" } }), "abc");
  const missing = mapStripeEventToMutation(
    { id: "evt_4", type: "checkout.session.completed", data: { object: {} } },
    null,
  );
  assert.equal("error" in missing && missing.error, "missing_user_id");
});

test("refund expires stripe only", () => {
  const mutation = mapStripeEventToMutation(
    {
      id: "evt_5",
      type: "charge.refunded",
      data: { object: { customer: "cus_1" } },
    },
    "user-1",
  );
  if (!("source" in mutation)) throw new Error("expected mutation");
  assert.equal(mutation.action, "refunded");
  const apple: EntitlementRow = {
    userId: "user-1",
    source: "apple",
    status: "active",
    expiresAt: null,
    productCode: "lst.plus",
    providerCustomerId: null,
    providerSubscriptionId: "orig_1",
  };
  const next = applySourceMutation([apple], mutation);
  assert.equal(next.find((r) => r.source === "apple")?.status, "active");
  assert.equal(next.find((r) => r.source === "stripe")?.status, "expired");
});
