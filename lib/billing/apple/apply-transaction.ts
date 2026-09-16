import "server-only";
import { persistSourceMutation } from "@/lib/billing/persist";
import {
  assertExpectedAppleProduct,
  parseAppleTransactionPayload,
} from "@/lib/billing/apple/jws";
import { verifyJwsWithEmbeddedX5c } from "@/lib/billing/apple/verify-jws";
import { PLUS_PRODUCT_CODE } from "@/lib/plus/rules";
import { createServiceClient } from "@/lib/supabase/service";

export async function applyVerifiedAppleTransaction(args: {
  signedTransaction: string;
  expectedUserId?: string;
}): Promise<{ userId: string; applied: boolean }> {
  const verified = await verifyJwsWithEmbeddedX5c(args.signedTransaction);
  if (!verified) {
    throw new Error("APPLE_JWS_UNVERIFIED");
  }
  const payload = parseAppleTransactionPayload(args.signedTransaction);
  assertExpectedAppleProduct(payload);

  const tokenUser = payload.appAccountToken ?? args.expectedUserId;
  if (!tokenUser) throw new Error("missing_app_account_token");
  if (args.expectedUserId && tokenUser !== args.expectedUserId) {
    throw new Error("apple_account_mismatch");
  }

  const service = createServiceClient();
  const { data: binding } = await service
    .from("apple_transaction_bindings")
    .select("user_id")
    .eq("original_transaction_id", payload.originalTransactionId)
    .maybeSingle();
  if (binding && binding.user_id !== tokenUser) {
    throw new Error("apple_transaction_bound_to_other_account");
  }
  if (!binding) {
    const { error } = await service.from("apple_transaction_bindings").insert({
      original_transaction_id: payload.originalTransactionId,
      user_id: tokenUser,
    });
    if (error && !/duplicate/i.test(error.message)) throw error;
  }

  const expired = Boolean(payload.revocationDate) ||
    (typeof payload.expiresDate === "number" && payload.expiresDate < Date.now());

  const persisted = await persistSourceMutation({
    userId: tokenUser,
    source: "apple",
    status: expired ? "expired" : "active",
    expiresAt: payload.expiresDate ? new Date(payload.expiresDate).toISOString() : null,
    productCode: PLUS_PRODUCT_CODE,
    providerCustomerId: null,
    providerSubscriptionId: payload.originalTransactionId,
    eventId: `apple:${payload.transactionId}`,
    action: expired ? "expired" : "granted",
  });

  return { userId: tokenUser, applied: persisted.applied };
}
