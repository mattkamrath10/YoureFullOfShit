import { PLUS_MONTHLY_PRODUCT_ID, PLUS_PRODUCT_CODE } from "@/lib/plus/rules";
import type { SourceMutation } from "@/lib/billing/apply-source";

export type AppleNotificationLike = {
  notificationType: string;
  notificationUUID: string;
  data?: {
    appAccountToken?: string;
    originalTransactionId?: string;
    expiresDate?: number;
    status?: number;
  };
};

/** Maps a decoded App Store Server Notification. Callers must verify JWS first. */
export function mapAppleNotification(
  notification: AppleNotificationLike,
): SourceMutation | { skip: true; reason: string } | { error: string } {
  const userId = notification.data?.appAccountToken;
  const original = notification.data?.originalTransactionId;
  if (!userId) return { error: "missing_app_account_token" };
  if (!original) return { error: "missing_original_transaction_id" };

  const expiresAt =
    typeof notification.data?.expiresDate === "number"
      ? new Date(notification.data.expiresDate).toISOString()
      : null;

  if (
    notification.notificationType === "EXPIRED" ||
    notification.notificationType === "REVOKE" ||
    notification.notificationType === "REFUND"
  ) {
    return {
      userId,
      source: "apple",
      status: notification.notificationType === "REFUND" ? "expired" : "expired",
      expiresAt: expiresAt ?? new Date().toISOString(),
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: null,
      providerSubscriptionId: original,
      eventId: notification.notificationUUID,
      action: notification.notificationType === "REFUND" ? "refunded" : "expired",
    };
  }

  if (
    notification.notificationType === "SUBSCRIBED" ||
    notification.notificationType === "DID_RENEW" ||
    notification.notificationType === "DID_RECOVER" ||
    notification.notificationType === "OFFER_REDEEMED"
  ) {
    return {
      userId,
      source: "apple",
      status: "active",
      expiresAt,
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: null,
      providerSubscriptionId: original,
      eventId: notification.notificationUUID,
      action: notification.notificationType === "SUBSCRIBED" ? "granted" : "renewed",
    };
  }

  return { skip: true, reason: notification.notificationType };
}

export const APPLE_PRODUCT_ID = PLUS_MONTHLY_PRODUCT_ID;

export function isAppleConfigured(): boolean {
  return Boolean(
    process.env.APP_STORE_ISSUER_ID?.trim() &&
      process.env.APP_STORE_KEY_ID?.trim() &&
      process.env.APP_STORE_PRIVATE_KEY?.trim(),
  );
}
