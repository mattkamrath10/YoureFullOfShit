import { PLUS_PRODUCT_CODE } from "@/lib/plus/rules";
import type { SourceMutation } from "@/lib/billing/apply-source";

export type GoogleNotificationLike = {
  eventId: string;
  packageName?: string;
  subscriptionNotification?: {
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  obfuscatedExternalAccountId?: string;
};

const SUBSCRIPTION_RECOVERED = 1;
const SUBSCRIPTION_RENEWED = 2;
const SUBSCRIPTION_CANCELED = 3;
const SUBSCRIPTION_PURCHASED = 4;
const SUBSCRIPTION_EXPIRED = 13;
const SUBSCRIPTION_REVOKED = 12;

/** Maps a decoded Play RTDN. Callers must verify with Play Developer API first. */
export function mapGoogleNotification(
  notification: GoogleNotificationLike,
  userId: string | null,
): SourceMutation | { skip: true; reason: string } | { error: string } {
  if (!userId) return { error: "missing_user_id" };
  const sub = notification.subscriptionNotification;
  if (!sub) return { skip: true, reason: "not_subscription" };

  const token = sub.purchaseToken;
  const type = sub.notificationType;

  if (type === SUBSCRIPTION_PURCHASED || type === SUBSCRIPTION_RENEWED || type === SUBSCRIPTION_RECOVERED) {
    return {
      userId,
      source: "google",
      status: "active",
      expiresAt: null,
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: null,
      providerSubscriptionId: token,
      eventId: notification.eventId,
      action: type === SUBSCRIPTION_PURCHASED ? "granted" : "renewed",
    };
  }

  if (type === SUBSCRIPTION_CANCELED) {
    return {
      userId,
      source: "google",
      status: "canceled",
      expiresAt: null,
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: null,
      providerSubscriptionId: token,
      eventId: notification.eventId,
      action: "canceled",
    };
  }

  if (type === SUBSCRIPTION_EXPIRED || type === SUBSCRIPTION_REVOKED) {
    return {
      userId,
      source: "google",
      status: "expired",
      expiresAt: new Date().toISOString(),
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: null,
      providerSubscriptionId: token,
      eventId: notification.eventId,
      action: type === SUBSCRIPTION_REVOKED ? "revoked" : "expired",
    };
  }

  return { skip: true, reason: `google_type_${type}` };
}

export function isGooglePlayConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() &&
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim(),
  );
}
