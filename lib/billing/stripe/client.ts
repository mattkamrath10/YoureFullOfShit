import "server-only";
import Stripe from "stripe";
import { isStripeConfigured } from "@/lib/billing/stripe/config";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  if (!cached) {
    cached = new Stripe(key);
  }
  return cached;
}

export function stripeReady(): boolean {
  return isStripeConfigured();
}
