import assert from "node:assert/strict";
import test from "node:test";
import { decodeJwsPayload } from "./jws.ts";

test("decodes JWS payload without claiming Apple verification", () => {
  const payload = Buffer.from(
    JSON.stringify({
      bundleId: "com.laststoryteller.app",
      productId: "com.laststoryteller.plus.monthly",
      transactionId: "1",
      originalTransactionId: "1",
    }),
  ).toString("base64url");
  const jws = `eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.sig`;
  const decoded = decodeJwsPayload(jws);
  assert.equal(decoded.bundleId, "com.laststoryteller.app");
});
