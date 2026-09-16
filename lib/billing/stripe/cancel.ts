import "server-only";
import { getStripe } from "@/lib/billing/stripe/client";
import { isStripeConfigured } from "@/lib/billing/stripe/config";
import { createServiceClient } from "@/lib/supabase/service";

/** Cancels Stripe subscription if configured. No-op when Stripe is not configured. Does not claim success without Stripe. */
export async function cancelStripeSubscriptionForUser(userId: string): Promise<{
  attempted: boolean;
  canceled: boolean;
  reason?: string;
}> {
  if (!isStripeConfigured()) {
    return { attempted: false, canceled: false, reason: "STRIPE_NOT_CONFIGURED" };
  }
  const service = createServiceClient();
  const { data } = await service
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.stripe_customer_id) {
    return { attempted: false, canceled: false, reason: "NO_STRIPE_CUSTOMER" };
  }
  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({
    customer: data.stripe_customer_id,
    status: "all",
    limit: 10,
  });
  let canceled = false;
  for (const sub of subs.data) {
    if (sub.status === "canceled") continue;
    await stripe.subscriptions.cancel(sub.id);
    canceled = true;
  }
  return { attempted: true, canceled };
}
