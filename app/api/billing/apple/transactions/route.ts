import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { isEmailAuthUser } from "@/lib/auth/session";
import { applyVerifiedAppleTransaction } from "@/lib/billing/apple/apply-transaction";
import { APPLE_PRODUCT_ID } from "@/lib/billing/apple/map-notification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !isEmailAuthUser(user)) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json()) as { signedTransaction?: string };
  if (!body.signedTransaction) {
    return NextResponse.json(
      {
        code: "APPLE_TRANSACTION_REQUIRED",
        productId: APPLE_PRODUCT_ID,
        appAccountToken: user.id,
        message: "Send the StoreKit 2 signed transaction JWS. Unverified client claims are ignored.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await applyVerifiedAppleTransaction({
      signedTransaction: body.signedTransaction,
      expectedUserId: user.id,
    });
    return NextResponse.json({ ok: true, source: "apple", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apple verification failed.";
    const status = message === "APPLE_JWS_UNVERIFIED" ? 400 : 400;
    return NextResponse.json({ error: message, source: "apple" }, { status });
  }
}
