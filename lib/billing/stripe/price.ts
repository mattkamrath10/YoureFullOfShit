import { PLUS_PRODUCT_CODE } from "@/lib/plus/rules";

/** Last Storyteller Plus — Stripe TEST-mode Price. Not a secret. Do not create another price. */
export const LAST_STORYTELLER_PLUS_STRIPE_TEST_PRICE_ID = "price_1UGFeWFNZZkempXKf2gMcxn6";

export const STRIPE_PRICE_ID_ENV = "STRIPE_PRICE_ID";

export function resolveStripePriceId(env: NodeJS.Dict<string | undefined> = process.env): string {
  const configured = env[STRIPE_PRICE_ID_ENV]?.trim();
  if (configured) return configured;
  const secret = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (secret.startsWith("sk_test_")) {
    return LAST_STORYTELLER_PLUS_STRIPE_TEST_PRICE_ID;
  }
  throw new Error("STRIPE_NOT_CONFIGURED");
}

export function stripeCheckoutLineItems(priceId: string) {
  return [{ price: priceId, quantity: 1 as const }];
}

export function buildStripeCheckoutSessionParams(args: {
  customerId: string;
  userId: string;
  origin: string;
  priceId: string;
}) {
  return {
    mode: "subscription" as const,
    customer: args.customerId,
    client_reference_id: args.userId,
    line_items: stripeCheckoutLineItems(args.priceId),
    success_url: `${args.origin}/plus?checkout=success`,
    cancel_url: `${args.origin}/plus?checkout=cancel`,
    subscription_data: {
      metadata: { user_id: args.userId, product_code: PLUS_PRODUCT_CODE },
    },
    metadata: { user_id: args.userId, product_code: PLUS_PRODUCT_CODE },
  };
}
