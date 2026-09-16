import "server-only";

/** Empty env = Stripe disabled. Never put live keys in the repo. */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim(),
  );
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}

export function getStripePriceId(): string {
  const id = process.env.STRIPE_PRICE_ID?.trim();
  if (!id) throw new Error("STRIPE_NOT_CONFIGURED");
  return id;
}

export const STRIPE_NOT_CONFIGURED = {
  code: "STRIPE_NOT_CONFIGURED",
  message:
    "Stripe is not configured in this environment. Last Storyteller Plus billing is disabled until keys and price id are set.",
} as const;
