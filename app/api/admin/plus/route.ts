import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/stories-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { PLUS_PRODUCT_CODE } from "@/lib/plus/rules";

export const runtime = "nodejs";

function expiresForDuration(duration: string): Date | null {
  const now = Date.now();
  switch (duration) {
    case "7d":
      return new Date(now + 7 * 86400000);
    case "30d":
      return new Date(now + 30 * 86400000);
    case "90d":
      return new Date(now + 90 * 86400000);
    case "1y":
      return new Date(now + 365 * 86400000);
    case "lifetime":
      return null;
    default:
      throw new Error("Invalid duration.");
  }
}

async function findUserIdByEmail(service: ReturnType<typeof createServiceClient>, email: string) {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const service = createServiceClient();
  const { data, error } = await service
    .from("entitlements")
    .select("id, user_id, source, status, expires_at, created_at, updated_at")
    .eq("source", "admin")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ entitlements: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    userId?: string;
    email?: string;
    duration?: string;
    notes?: string;
  };

  const duration = body.duration ?? "30d";
  let expiresAt: Date | null;
  try {
    expiresAt = expiresForDuration(duration);
  } catch {
    return NextResponse.json({ error: "Invalid duration." }, { status: 400 });
  }

  const service = createServiceClient();
  let userId = body.userId?.trim() || "";
  if (!userId && body.email) {
    const found = await findUserIdByEmail(service, body.email);
    if (!found) return NextResponse.json({ error: "No account found for that email." }, { status: 404 });
    userId = found;
  }
  if (!userId) return NextResponse.json({ error: "userId or email is required." }, { status: 400 });

  const { data: entitlement, error } = await service
    .from("entitlements")
    .insert({
      user_id: userId,
      source: "admin",
      status: "active",
      expires_at: expiresAt?.toISOString() ?? null,
      product_code: PLUS_PRODUCT_CODE,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await service.from("entitlement_events").insert({
    entitlement_id: entitlement.id,
    user_id: userId,
    source: "admin",
    action: "granted",
    actor_user_id: admin.userId,
    notes: body.notes?.trim() || null,
  });

  return NextResponse.json({ ok: true, entitlementId: entitlement.id, userId });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as { entitlementId?: string };
  const entitlementId = body.entitlementId?.trim() ?? "";
  if (!entitlementId) return NextResponse.json({ error: "entitlementId is required." }, { status: 400 });

  const service = createServiceClient();
  const { data: row, error: loadError } = await service
    .from("entitlements")
    .select("id, user_id, source")
    .eq("id", entitlementId)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: "Entitlement not found." }, { status: 404 });
  if (row.source !== "admin") {
    return NextResponse.json({ error: "Only admin entitlements can be revoked here." }, { status: 400 });
  }

  const { error } = await service
    .from("entitlements")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", entitlementId)
    .eq("source", "admin");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await service.from("entitlement_events").insert({
    entitlement_id: entitlementId,
    user_id: row.user_id,
    source: "admin",
    action: "revoked",
    actor_user_id: admin.userId,
  });

  return NextResponse.json({ ok: true });
}
