import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { isEmailAuthUser } from "@/lib/auth/session";
import { isNativeShellUserAgent } from "@/lib/native/platform";
import { STRIPE_NOT_CONFIGURED, getStripePriceId, isStripeConfigured } from "@/lib/billing/stripe/config";
import { getStripe } from "@/lib/billing/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteUrl } from "@/lib/site";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isNativeShellUserAgent(request.headers.get("user-agent"))) {
    return NextResponse.json(
      {
        error:
          "Web Checkout is not available in the iOS or Android app. Use Restore Purchases / in-app purchase on that platform.",
        code: "NATIVE_STRIPE_BLOCKED",
      },
      { status: 403 },
    );
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(STRIPE_NOT_CONFIGURED, { status: 503 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user || !isEmailAuthUser(user)) {
    return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  }
  const limited = rateLimit({ key: `stripe-checkout:${user.id}`, limit: 8, windowMs: 10 * 60_000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many checkout attempts." }, { status: 429 });
  }

  const stripe = getStripe();
  const service = createServiceClient();
  const { data: existing } = await service
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await service.from("billing_customers").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    });
  }

  const origin = getSiteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: getStripePriceId(), quantity: 1 }],
    success_url: `${origin}/plus?checkout=success`,
    cancel_url: `${origin}/plus?checkout=cancel`,
    subscription_data: {
      metadata: { user_id: user.id },
    },
    metadata: { user_id: user.id },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a Checkout URL." }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
