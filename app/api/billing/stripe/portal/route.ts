import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { isEmailAuthUser } from "@/lib/auth/session";
import { isNativeShellUserAgent } from "@/lib/native/platform";
import { STRIPE_NOT_CONFIGURED, isStripeConfigured } from "@/lib/billing/stripe/config";
import { getStripe } from "@/lib/billing/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isNativeShellUserAgent(request.headers.get("user-agent"))) {
    return NextResponse.json({ error: "Use the store subscription settings on this device.", code: "NATIVE_STRIPE_BLOCKED" }, { status: 403 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(STRIPE_NOT_CONFIGURED, { status: 503 });
  }
  const user = await getAuthenticatedUser(request);
  if (!user || !isEmailAuthUser(user)) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const service = createServiceClient();
  const { data } = await service
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer for this account." }, { status: 404 });
  }
  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${getSiteUrl()}/plus`,
  });
  return NextResponse.json({ url: portal.url });
}
