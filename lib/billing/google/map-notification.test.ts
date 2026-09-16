import assert from "node:assert/strict";
import test from "node:test";
import { applySourceMutation } from "../apply-source.ts";
import { mapGoogleNotification } from "./map-notification.ts";

test("google purchase does not overwrite apple", () => {
  const mapped = mapGoogleNotification(
    {
      eventId: "g1",
      subscriptionNotification: {
        notificationType: 4,
        purchaseToken: "tok",
        subscriptionId: "plus",
      },
    },
    "u1",
  );
  if (!("source" in mapped)) throw new Error("expected mutation");
  const next = applySourceMutation(
    [
      {
        userId: "u1",
        source: "apple",
        status: "active",
        expiresAt: null,
        productCode: "lst.plus",
        providerCustomerId: null,
        providerSubscriptionId: "orig",
      },
    ],
    mapped,
  );
  assert.equal(next.find((r) => r.source === "apple")?.status, "active");
  assert.equal(next.find((r) => r.source === "google")?.source, "google");
});
