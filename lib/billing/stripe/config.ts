import "server-only";

import { resolveStripePriceId } from "@/lib/billing/stripe/price";

/** Empty env = Stripe disabled. Never put live keys in the repo. */
export function isStripeConfigured(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return false;
  try {
    resolveStripePriceId();
    return true;
  } catch {
    return false;
  }
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}

export function getStripePriceId(): string {
  return resolveStripePriceId();
}

export const STRIPE_NOT_CONFIGURED = {
  code: "STRIPE_NOT_CONFIGURED",
  message:
    "Stripe is not configured in this environment. Last Storyteller Plus billing is disabled until keys and price id are set.",
} as const;
