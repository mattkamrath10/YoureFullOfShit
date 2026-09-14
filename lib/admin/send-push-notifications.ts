import "server-only";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

type PushDeliveryResult = {
  attempted: number;
  delivered: number;
  allDelivered: boolean;
};

export async function sendAdminPushNotifications(
  service: ReturnType<typeof createServiceClient>,
  payload: { title: string; body: string; url: string; tag: string },
): Promise<PushDeliveryResult> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) {
    console.info("[admin-push] VAPID is not configured; using email fallback.");
    return { attempted: 0, delivered: 0, allDelivered: false };
  }

  const { data: admins, error: adminError } = await service
    .from("profiles")
    .select("id")
    .eq("is_admin", true);
  if (adminError) {
    console.error("[admin-push] admin lookup failed", adminError);
    return { attempted: 0, delivered: 0, allDelivered: false };
  }
  const adminIds = (admins ?? []).map((admin) => admin.id as string);
  if (adminIds.length === 0) {
    return { attempted: 0, delivered: 0, allDelivered: false };
  }

  const { data: subscriptions, error: subscriptionError } = await service
    .from("admin_push_subscriptions")
    .select("user_id, endpoint, auth, p256dh")
    .in("user_id", adminIds);
  if (subscriptionError) {
    console.error("[admin-push] subscription lookup failed", subscriptionError);
    return { attempted: 0, delivered: 0, allDelivered: false };
  }
  if (!subscriptions?.length) {
    return { attempted: 0, delivered: 0, allDelivered: false };
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const encodedPayload = JSON.stringify(payload);
  let delivered = 0;
  const subscribedAdminUsers = new Set(
    subscriptions.map((subscription) => subscription.user_id as string),
  );

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { auth: subscription.auth, p256dh: subscription.p256dh },
          },
          encodedPayload,
        );
        delivered += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : 0;
        console.error("[admin-push] delivery failed", {
          endpoint: subscription.endpoint,
          statusCode,
        });
        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await service
            .from("admin_push_subscriptions")
            .delete()
            .eq("endpoint", subscription.endpoint);
          if (deleteError) {
            console.error("[admin-push] stale subscription removal failed", deleteError);
          }
        }
      }
    }),
  );

  return {
    attempted: subscriptions.length,
    delivered,
    allDelivered:
      delivered === subscriptions.length &&
      subscribedAdminUsers.size === adminIds.length,
  };
}
