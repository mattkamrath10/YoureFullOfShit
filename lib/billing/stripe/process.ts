import {
  mapStripeEventToMutation,
  userIdFromStripeObject,
  type StripeLikeEvent,
} from "@/lib/billing/stripe/map-event";
import type { SourceMutation } from "@/lib/billing/apply-source";

export async function resolveStripeUserId(args: {
  event: StripeLikeEvent;
  lookupByCustomerId: (customerId: string) => Promise<string | null>;
}): Promise<string | null> {
  const obj = args.event.data.object;
  const fromObject = userIdFromStripeObject(obj);
  if (fromObject) return fromObject;
  const customer = typeof obj.customer === "string" ? obj.customer : null;
  if (!customer) return null;
  return args.lookupByCustomerId(customer);
}

export async function stripeEventToMutation(args: {
  event: StripeLikeEvent;
  lookupByCustomerId: (customerId: string) => Promise<string | null>;
}): Promise<SourceMutation | { skip: true; reason: string } | { error: string }> {
  const userId = await resolveStripeUserId(args);
  return mapStripeEventToMutation(args.event, userId);
}
