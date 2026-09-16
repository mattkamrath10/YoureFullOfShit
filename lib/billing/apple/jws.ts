import { createHash } from "node:crypto";
import { PLUS_MONTHLY_PRODUCT_ID } from "@/lib/plus/rules";

export type AppleTransactionPayload = {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  expiresDate?: number;
  purchaseDate?: number;
  appAccountToken?: string;
  environment?: string;
  type?: string;
  revocationDate?: number;
};

export function decodeJwsPayload(jws: string): Record<string, unknown> {
  const parts = jws.split(".");
  if (parts.length < 2) throw new Error("invalid_jws");
  const payload = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export function parseAppleTransactionPayload(jws: string): AppleTransactionPayload {
  const raw = decodeJwsPayload(jws);
  if (typeof raw.transactionId !== "string" || typeof raw.originalTransactionId !== "string") {
    throw new Error("invalid_apple_transaction");
  }
  return {
    transactionId: raw.transactionId,
    originalTransactionId: raw.originalTransactionId,
    bundleId: String(raw.bundleId ?? ""),
    productId: String(raw.productId ?? ""),
    expiresDate: typeof raw.expiresDate === "number" ? raw.expiresDate : undefined,
    purchaseDate: typeof raw.purchaseDate === "number" ? raw.purchaseDate : undefined,
    appAccountToken: typeof raw.appAccountToken === "string" ? raw.appAccountToken : undefined,
    environment: typeof raw.environment === "string" ? raw.environment : undefined,
    type: typeof raw.type === "string" ? raw.type : undefined,
    revocationDate: typeof raw.revocationDate === "number" ? raw.revocationDate : undefined,
  };
}

export function assertExpectedAppleProduct(payload: AppleTransactionPayload) {
  if (payload.bundleId !== "com.laststoryteller.app") {
    throw new Error("apple_bundle_mismatch");
  }
  if (payload.productId !== PLUS_MONTHLY_PRODUCT_ID) {
    throw new Error("apple_product_mismatch");
  }
}

export function appleJwsFingerprint(jws: string): string {
  return createHash("sha256").update(jws).digest("hex");
}
