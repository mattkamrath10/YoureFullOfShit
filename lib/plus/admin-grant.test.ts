import assert from "node:assert/strict";
import test from "node:test";
import {
  canRevokeEntitlementSource,
  expiresForAdminGrant,
  revokeOnlyMatchingSource,
} from "./admin-grant.ts";

test("admin durations include lifetime and custom future dates", () => {
  const now = new Date("2026-09-16T00:00:00.000Z");
  assert.equal(expiresForAdminGrant({ duration: "lifetime", now }), null);
  const month = expiresForAdminGrant({ duration: "30d", now });
  assert.equal(month?.toISOString(), "2026-10-16T00:00:00.000Z");
  const custom = expiresForAdminGrant({
    duration: "custom",
    customExpiresAt: "2026-12-01T00:00:00.000Z",
    now,
  });
  assert.equal(custom?.toISOString(), "2026-12-01T00:00:00.000Z");
});

test("admin/promo revoke does not touch stripe or apple", () => {
  assert.equal(canRevokeEntitlementSource("admin"), true);
  assert.equal(canRevokeEntitlementSource("promo"), true);
  assert.equal(canRevokeEntitlementSource("stripe"), false);
  assert.equal(canRevokeEntitlementSource("apple"), false);
  assert.equal(
    revokeOnlyMatchingSource({ source: "stripe", expected: "admin" }),
    null,
  );
  assert.equal(
    revokeOnlyMatchingSource({ source: "admin", expected: "admin" }),
    "revoked",
  );
});
