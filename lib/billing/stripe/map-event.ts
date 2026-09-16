import { PLUS_PRODUCT_CODE, type EntitlementStatus } from "@/lib/plus/rules";
import type { SourceMutation } from "@/lib/billing/apply-source";

export type StripeLikeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function unixToIso(seconds: unknown): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function statusFromStripe(status: unknown, cancelAtPeriodEnd: unknown): EntitlementStatus {
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  if (cancelAtPeriodEnd === true) return "canceled";
  return "active";
}

export function mapStripeEventToMutation(
  event: StripeLikeEvent,
  userId: string | null,
): SourceMutation | { skip: true; reason: string } | { error: string } {
  if (!userId) return { error: "missing_user_id" };
  const obj = event.data.object;
  const customer =
    typeof obj.customer === "string"
      ? obj.customer
      : typeof obj.customer === "object" && obj.customer && "id" in obj.customer
        ? String((obj.customer as { id: string }).id)
        : null;

  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_succeeded"
  ) {
    const subscription =
      typeof obj.subscription === "string"
        ? obj.subscription
        : typeof obj.id === "string" && event.type.startsWith("customer.subscription")
          ? obj.id
          : typeof obj.subscription === "string"
            ? obj.subscription
            : null;
    const periodEnd =
      unixToIso(obj.current_period_end) ??
      unixToIso((obj.lines as { data?: Array<{ period?: { end?: number } }> } | undefined)?.data?.[0]?.period?.end) ??
      null;
    const stripeStatus = obj.status;
    const cancelAtPeriodEnd = obj.cancel_at_period_end;
    const status = statusFromStripe(stripeStatus, cancelAtPeriodEnd);
    return {
      userId,
      source: "stripe",
      status,
      expiresAt: periodEnd,
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: customer,
      providerSubscriptionId: subscription,
      eventId: event.id,
      action:
        event.type === "checkout.session.completed"
          ? "granted"
          : status === "canceled"
            ? "canceled"
            : "renewed",
    };
  }

  if (event.type === "invoice.payment_failed") {
    return {
      userId,
      source: "stripe",
      status: "past_due",
      expiresAt: unixToIso(obj.current_period_end),
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: customer,
      providerSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : null,
      eventId: event.id,
      action: "canceled",
    };
  }

  if (event.type === "customer.subscription.deleted") {
    return {
      userId,
      source: "stripe",
      status: "expired",
      expiresAt: unixToIso(obj.ended_at) ?? unixToIso(obj.current_period_end) ?? new Date().toISOString(),
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: customer,
      providerSubscriptionId: typeof obj.id === "string" ? obj.id : null,
      eventId: event.id,
      action: "expired",
    };
  }

  if (event.type === "charge.refunded") {
    return {
      userId,
      source: "stripe",
      status: "expired",
      expiresAt: new Date().toISOString(),
      productCode: PLUS_PRODUCT_CODE,
      providerCustomerId: customer,
      providerSubscriptionId: null,
      eventId: event.id,
      action: "refunded",
    };
  }

  return { skip: true, reason: event.type };
}

export function userIdFromStripeObject(obj: Record<string, unknown>): string | null {
  const metadata = obj.metadata as { user_id?: string; userId?: string } | undefined;
  const fromMeta = metadata?.user_id || metadata?.userId;
  if (fromMeta) return fromMeta;
  const clientRef = obj.client_reference_id;
  if (typeof clientRef === "string" && clientRef.length > 0) return clientRef;
  return null;
}
