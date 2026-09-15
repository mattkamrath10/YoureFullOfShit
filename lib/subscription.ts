export const PLUS_MONTHLY_PRODUCT_ID = "com.laststoryteller.plus.monthly";
export const PLUS_INTENDED_US_PRICE = "$0.99/month";

export type AccessTier = "free" | "plus" | "unknown";

export const TIER_LIMITS = {
  free: { maxVideoBytes: 1024 * 1024 * 1024, storageBytes: null, uploadsPerPeriod: null },
  plus: { maxVideoBytes: 2 * 1024 * 1024 * 1024, storageBytes: null, uploadsPerPeriod: null },
} as const;

export const PLUS_FEATURES = [
  "More video storage",
  "Larger and longer uploads",
  "Additional Plus features",
  "Ad-free experience if advertising is introduced",
] as const;
