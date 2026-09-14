import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PushSubscriptionBody = {
  endpoint?: unknown;
  keys?: { auth?: unknown; p256dh?: unknown };
};

async function requireAdminUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", auth.user.id)
    .maybeSingle();
  return profile?.is_admin ? auth.user : null;
}

function parseSubscription(body: PushSubscriptionBody | null) {
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth.trim() : "";
  const p256dh =
    typeof body?.keys?.p256dh === "string" ? body.keys.p256dh.trim() : "";
  if (!endpoint || !auth || !p256dh || !endpoint.startsWith("https://")) {
    return null;
  }
  return { endpoint, auth, p256dh };
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const subscription = parseSubscription(
    (await request.json().catch(() => null)) as PushSubscriptionBody | null,
  );
  if (!subscription) {
    return NextResponse.json(
      { ok: false, error: "invalid_subscription" },
      { status: 400 },
    );
  }

  try {
    const service = createServiceClient();
    const { data: existing, error: lookupError } = await service
      .from("admin_push_subscriptions")
      .select("user_id")
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "subscription_belongs_to_another_user" },
        { status: 409 },
      );
    }

    const { error } = await service.from("admin_push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        auth: subscription.auth,
        p256dh: subscription.p256dh,
        user_agent: request.headers.get("user-agent"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-push] subscription save failed", error);
    return NextResponse.json(
      { ok: false, error: "subscription_save_failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint) {
    return NextResponse.json(
      { ok: false, error: "endpoint_required" },
      { status: 400 },
    );
  }

  try {
    const service = createServiceClient();
    const { error } = await service
      .from("admin_push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-push] subscription delete failed", error);
    return NextResponse.json(
      { ok: false, error: "subscription_delete_failed" },
      { status: 500 },
    );
  }
}
