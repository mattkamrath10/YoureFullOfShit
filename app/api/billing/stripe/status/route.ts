import { NextResponse } from "next/server";
import { isNativeShellUserAgent } from "@/lib/native/platform";
import { isStripeConfigured } from "@/lib/billing/stripe/config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json({
    configured: isStripeConfigured(),
    nativeBlocked: isNativeShellUserAgent(request.headers.get("user-agent")),
    price: "$1.99/month",
    product: "lst.plus",
  });
}
