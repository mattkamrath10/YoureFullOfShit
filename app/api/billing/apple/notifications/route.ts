import { NextResponse } from "next/server";
import { isAppleConfigured } from "@/lib/billing/apple/map-notification";

export const runtime = "nodejs";

/**
 * App Store Server Notifications V2.
 * Does not apply entitlements unless Apple credentials exist and the payload is verified.
 */
export async function POST() {
  if (!isAppleConfigured()) {
    return NextResponse.json(
      {
        code: "APPLE_NOT_CONFIGURED",
        message:
          "App Store notifications are not configured. Payload was not verified and no apple entitlement was written.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    {
      code: "APPLE_VERIFY_NOT_WIRED",
      message:
        "Apple credentials are present but JWS verification against App Store Server API is not activated in this environment.",
    },
    { status: 501 },
  );
}
