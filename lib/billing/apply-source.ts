import type { EntitlementSource, EntitlementStatus } from "@/lib/plus/rules";

export type EntitlementRow = {
  id?: string;
  userId: string;
  source: EntitlementSource;
  status: EntitlementStatus;
  expiresAt: string | null;
  productCode: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
};

export type SourceMutation = {
  userId: string;
  source: EntitlementSource;
  status: EntitlementStatus;
  expiresAt: string | null;
  productCode: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  eventId: string;
  action:
    | "granted"
    | "renewed"
    | "canceled"
    | "expired"
    | "revoked"
    | "refunded"
    | "period_extended";
};

/** Apply one provider mutation without rewriting other sources. */
export function applySourceMutation(
  rows: EntitlementRow[],
  mutation: SourceMutation,
): EntitlementRow[] {
  const others = rows.filter((row) => row.source !== mutation.source);
  const current = rows.find((row) => row.source === mutation.source);
  const next: EntitlementRow = {
    id: current?.id,
    userId: mutation.userId,
    source: mutation.source,
    status: mutation.status,
    expiresAt: mutation.expiresAt,
    productCode: mutation.productCode,
    providerCustomerId: mutation.providerCustomerId,
    providerSubscriptionId: mutation.providerSubscriptionId,
  };
  return [...others, next];
}

export function userHasPlusFromRows(
  rows: EntitlementRow[],
  now = new Date(),
): boolean {
  return rows.some((row) => {
    if (row.productCode !== "lst.plus") return false;
    if (row.status !== "active" && row.status !== "canceled" && row.status !== "past_due") {
      return false;
    }
    if (row.expiresAt == null) return true;
    return new Date(row.expiresAt).getTime() > now.getTime();
  });
}
