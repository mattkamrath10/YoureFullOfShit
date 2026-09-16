import { NextResponse } from "next/server";
import { persistSourceMutation } from "@/lib/billing/persist";
import { isStripeWebhookConfigured, STRIPE_NOT_CONFIGURED } from "@/lib/billing/stripe/config";
import { getStripe } from "@/lib/billing/stripe/client";
import { stripeEventToMutation } from "@/lib/billing/stripe/process";
import { createServiceClient } from "@/lib/supabase/service";
import type { StripeLikeEvent } from "@/lib/billing/stripe/map-event";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(STRIPE_NOT_CONFIGURED, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const raw = await request.text();
  let event: StripeLikeEvent;
  try {
    const stripe = getStripe();
    const verified = stripe.webhooks.constructEvent(
      raw,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!.trim(),
    );
    event = verified as unknown as StripeLikeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature. Event was not applied." }, { status: 400 });
  }

  const service = createServiceClient();
  const result = await stripeEventToMutation({
    event,
    lookupByCustomerId: async (customerId) => {
      const { data } = await service
        .from("billing_customers")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      return data?.user_id ?? null;
    },
  });

  if ("skip" in result) {
    return NextResponse.json({ ok: true, skipped: result.reason });
  }
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const persisted = await persistSourceMutation(result);
  return NextResponse.json({ ok: true, applied: persisted.applied, source: "stripe" });
}
