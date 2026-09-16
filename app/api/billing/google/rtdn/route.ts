import { NextResponse } from "next/server";
import { isGooglePlayConfigured } from "@/lib/billing/google/map-notification";

export const runtime = "nodejs";

export async function POST() {
  if (!isGooglePlayConfigured()) {
    return NextResponse.json(
      {
        code: "GOOGLE_NOT_CONFIGURED",
        message:
          "Google Play RTDN is not configured. Notification was not verified and no google entitlement was written.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    {
      code: "GOOGLE_VERIFY_NOT_WIRED",
      message:
        "Play credentials are present but Developer API verification is not activated in this environment.",
    },
    { status: 501 },
  );
}
