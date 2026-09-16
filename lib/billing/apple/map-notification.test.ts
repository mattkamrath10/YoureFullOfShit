import assert from "node:assert/strict";
import test from "node:test";
import { applySourceMutation, type EntitlementRow } from "../apply-source.ts";
import { mapAppleNotification } from "./map-notification.ts";

test("apple grant does not overwrite stripe", () => {
  const stripe: EntitlementRow = {
    userId: "u1",
    source: "stripe",
    status: "active",
    expiresAt: "2099-01-01T00:00:00.000Z",
    productCode: "lst.plus",
    providerCustomerId: "cus",
    providerSubscriptionId: "sub",
  };
  const mapped = mapAppleNotification({
    notificationType: "SUBSCRIBED",
    notificationUUID: "n1",
    data: {
      appAccountToken: "u1",
      originalTransactionId: "orig-1",
      expiresDate: Date.parse("2099-02-01T00:00:00.000Z"),
    },
  });
  assert.equal("source" in mapped && mapped.source, "apple");
  if (!("source" in mapped)) throw new Error("expected mutation");
  const next = applySourceMutation([stripe], mapped);
  assert.equal(next.find((r) => r.source === "stripe")?.status, "active");
  assert.equal(next.find((r) => r.source === "apple")?.providerSubscriptionId, "orig-1");
});

test("unverified apple path is not implied by mapping alone", () => {
  const missing = mapAppleNotification({
    notificationType: "SUBSCRIBED",
    notificationUUID: "n2",
    data: {},
  });
  assert.equal("error" in missing && missing.error, "missing_app_account_token");
});
