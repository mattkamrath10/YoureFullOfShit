import { LARGE_VIDEO_THRESHOLD_BYTES } from "@/lib/plus/rules";
import {
  applyEntitlementRefreshResult,
  parsePlusUsage,
  type PlusUsage,
} from "@/lib/plus/usage";

export {
  applyEntitlementRefreshResult,
  createRefreshLock,
  parsePlusUsage,
  PLUS_USAGE_ENDPOINT,
  PLUS_USAGE_REFRESH_ERROR,
  plusNavAppearance,
} from "@/lib/plus/usage";

/** Client-side re-check after an authoritative refresh. Server still enforces R2. */
export function largeVideoAllowedByClientEntitlement(args: {
  hasPlus: boolean;
  byteSize: number;
}): boolean {
  if (args.byteSize <= LARGE_VIDEO_THRESHOLD_BYTES) return true;
  return args.hasPlus;
}
