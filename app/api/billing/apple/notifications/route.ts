import { NextResponse } from "next/server";
import { decodeJwsPayload } from "@/lib/billing/apple/jws";
import { applyVerifiedAppleTransaction } from "@/lib/billing/apple/apply-transaction";
import { verifyJwsWithEmbeddedX5c } from "@/lib/billing/apple/verify-jws";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { signedPayload?: string };
  if (!body.signedPayload) {
    return NextResponse.json({ error: "signedPayload required" }, { status: 400 });
  }
  const outerOk = await verifyJwsWithEmbeddedX5c(body.signedPayload);
  if (!outerOk) {
    return NextResponse.json(
      { error: "APPLE_JWS_UNVERIFIED", message: "Notification JWS was not verified. No entitlement written." },
      { status: 400 },
    );
  }
  const outer = decodeJwsPayload(body.signedPayload);
  const data = outer.data as { signedTransactionInfo?: string } | undefined;
  if (!data?.signedTransactionInfo) {
    return NextResponse.json({ ok: true, skipped: "no_signed_transaction" });
  }
  try {
    const result = await applyVerifiedAppleTransaction({
      signedTransaction: data.signedTransactionInfo,
    });
    return NextResponse.json({ ok: true, source: "apple", ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Apple notification failed." },
      { status: 400 },
    );
  }
}
