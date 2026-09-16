import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { isEmailAuthUser } from "@/lib/auth/session";
import { isAppleConfigured, APPLE_PRODUCT_ID } from "@/lib/billing/apple/map-notification";

export const runtime = "nodejs";

/** Restore / transaction submit. Never treats an unverified JWS as Plus. */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !isEmailAuthUser(user)) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!isAppleConfigured()) {
    return NextResponse.json(
      {
        code: "APPLE_NOT_CONFIGURED",
        productId: APPLE_PRODUCT_ID,
        appAccountToken: user.id,
        message:
          "StoreKit verification is not configured. This request did not grant Plus.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    {
      code: "APPLE_VERIFY_NOT_WIRED",
      appAccountToken: user.id,
      productId: APPLE_PRODUCT_ID,
      message: "Apple credentials exist but transaction JWS verification is not activated.",
    },
    { status: 501 },
  );
}
