import "server-only";
import { PLUS_PRODUCT_CODE } from "@/lib/plus/rules";
import type { SourceMutation } from "@/lib/billing/apply-source";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Persists a billing adapter mutation. Writes only the mutation.source row.
 * Idempotent when entitlement_events.raw_ref matches the event id.
 */
export async function persistSourceMutation(mutation: SourceMutation): Promise<{ applied: boolean }> {
  const service = createServiceClient();
  const { data: existingEvent } = await service
    .from("entitlement_events")
    .select("id")
    .eq("raw_ref", mutation.eventId)
    .maybeSingle();
  if (existingEvent) return { applied: false };

  const { data: currentRows } = await service
    .from("entitlements")
    .select("id")
    .eq("user_id", mutation.userId)
    .eq("source", mutation.source)
    .eq("product_code", mutation.productCode)
    .limit(1);
  const current = currentRows?.[0];

  let entitlementId: string;
  if (current?.id) {
    const { error } = await service
      .from("entitlements")
      .update({
        status: mutation.status,
        expires_at: mutation.expiresAt,
        provider_customer_id: mutation.providerCustomerId,
        provider_subscription_id: mutation.providerSubscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .eq("source", mutation.source);
    if (error) throw error;
    entitlementId = current.id;
  } else {
    const { data, error } = await service
      .from("entitlements")
      .insert({
        user_id: mutation.userId,
        source: mutation.source,
        status: mutation.status,
        expires_at: mutation.expiresAt,
        product_code: PLUS_PRODUCT_CODE,
        provider_customer_id: mutation.providerCustomerId,
        provider_subscription_id: mutation.providerSubscriptionId,
      })
      .select("id")
      .single();
    if (error) throw error;
    entitlementId = data.id;
  }

  const { error: eventError } = await service.from("entitlement_events").insert({
    entitlement_id: entitlementId,
    user_id: mutation.userId,
    source: mutation.source,
    action: mutation.action,
    raw_ref: mutation.eventId,
  });
  if (eventError) throw eventError;
  return { applied: true };
}
