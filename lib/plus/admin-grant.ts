import type { EntitlementSource, EntitlementStatus } from "@/lib/plus/rules";

export type DurationPreset = "7d" | "30d" | "90d" | "1y" | "lifetime" | "custom";

export function expiresForAdminGrant(args: {
  duration: string;
  customExpiresAt?: string | null;
  now?: Date;
}): Date | null {
  const now = args.now ?? new Date();
  switch (args.duration) {
    case "7d":
      return new Date(now.getTime() + 7 * 86400000);
    case "30d":
      return new Date(now.getTime() + 30 * 86400000);
    case "90d":
      return new Date(now.getTime() + 90 * 86400000);
    case "1y":
      return new Date(now.getTime() + 365 * 86400000);
    case "lifetime":
      return null;
    case "custom": {
      if (!args.customExpiresAt) throw new Error("custom_expires_required");
      const exp = new Date(args.customExpiresAt);
      if (Number.isNaN(exp.getTime()) || exp.getTime() <= now.getTime()) {
        throw new Error("invalid_custom_expiry");
      }
      return exp;
    }
    default:
      throw new Error("invalid_duration");
  }
}

export function canRevokeEntitlementSource(source: EntitlementSource): boolean {
  return source === "admin" || source === "promo";
}

export function revokeOnlyMatchingSource(args: {
  source: EntitlementSource;
  expected: EntitlementSource;
}): EntitlementStatus | null {
  if (args.source !== args.expected) return null;
  if (!canRevokeEntitlementSource(args.source)) return null;
  return "revoked";
}
