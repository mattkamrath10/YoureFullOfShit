import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/r2/auth";
import { isR2Configured } from "@/lib/r2/config";
import { abortR2MultipartVideoUpload } from "@/lib/r2/upload";

export const runtime = "nodejs";

/**
 * POST /api/r2/upload/abort
 * Phase 1 foundation — abort incomplete multipart uploads.
 */
export async function POST(req: Request) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "R2 is not configured on this environment yet.", code: "R2_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const user = await requireAuthUser();
    const body = (await req.json()) as { objectKey?: string; uploadId?: string };

    if (!body.objectKey || !body.uploadId) {
      return NextResponse.json(
        { error: "objectKey and uploadId are required." },
        { status: 400 },
      );
    }

    if (!body.objectKey.includes(`/${user.id}/`)) {
      return NextResponse.json({ error: "Not allowed to abort this upload." }, { status: 403 });
    }

    await abortR2MultipartVideoUpload({
      objectKey: body.objectKey,
      uploadId: body.uploadId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[r2/upload/abort]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not abort R2 upload." },
      { status: 400 },
    );
  }
}
