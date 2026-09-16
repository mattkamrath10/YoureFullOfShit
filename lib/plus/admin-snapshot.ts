import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { userHasPlusFromRows, type EntitlementRow } from "@/lib/billing/apply-source";
import {
  FREE_STORY_SUBMISSIONS,
  PLUS_LARGE_VIDEOS_PER_MONTH,
  PLUS_MAX_STORAGE_BYTES,
  PLUS_PRODUCT_CODE,
  type EntitlementSource,
  type EntitlementStatus,
} from "@/lib/plus/rules";

export async function getAdminUserSnapshot(userId: string) {
  const service = createServiceClient();
  const [{ data: profile }, { data: entitlements }, { data: media }, { data: logs }, { data: reserved }] =
    await Promise.all([
      service.from("profiles").select("id, display_name, username, stories_submitted_count, media_bytes_used").eq("id", userId).maybeSingle(),
      service
        .from("entitlements")
        .select("id, user_id, source, status, expires_at, product_code, provider_customer_id, provider_subscription_id")
        .eq("user_id", userId),
      service.from("story_media").select("byte_size").eq("owner_id", userId),
      service.from("large_video_upload_log").select("created_at").eq("user_id", userId),
      service.from("r2_upload_reservations").select("byte_size").eq("user_id", userId),
    ]);

  const rows: EntitlementRow[] = (entitlements ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    source: row.source as EntitlementSource,
    status: row.status as EntitlementStatus,
    expiresAt: row.expires_at,
    productCode: row.product_code ?? PLUS_PRODUCT_CODE,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
  }));

  const stored =
    (media ?? []).reduce((n, m) => n + Number(m.byte_size ?? 0), 0) +
    (reserved ?? []).reduce((n, m) => n + Number(m.byte_size ?? 0), 0);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const largeVideosThisMonth = (logs ?? []).filter(
    (row) => new Date(row.created_at).getTime() >= monthStart.getTime(),
  ).length;

  return {
    userId,
    displayName: profile?.display_name ?? null,
    username: profile?.username ?? null,
    storiesSubmittedCount: profile?.stories_submitted_count ?? 0,
    hasPlus: userHasPlusFromRows(rows),
    entitlements: rows,
    largeVideosThisMonth,
    storageBytes: stored,
    freeStoryLimit: FREE_STORY_SUBMISSIONS,
    largeVideosPerMonth: PLUS_LARGE_VIDEOS_PER_MONTH,
    maxStorageBytes: PLUS_MAX_STORAGE_BYTES,
  };
}
