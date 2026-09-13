import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/r2/auth";
import { isR2Configured } from "@/lib/r2/config";
import { completeR2MultipartVideoUpload } from "@/lib/r2/upload";

export const runtime = "nodejs";

/**
 * POST /api/r2/upload/complete
 * Phase 1 foundation — completes multipart after browser PUTs parts.
 * Does not write story_media yet (Phase 2).
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
    const body = (await req.json()) as {
      objectKey?: string;
      uploadId?: string;
      parts?: Array<{ partNumber: number; etag: string }>;
    };

    if (!body.objectKey || !body.uploadId || !body.parts?.length) {
      return NextResponse.json(
        { error: "objectKey, uploadId, and parts are required." },
        { status: 400 },
      );
    }

    if (!body.objectKey.includes(`/${user.id}/`)) {
      return NextResponse.json({ error: "Not allowed to complete this upload." }, { status: 403 });
    }

    const result = await completeR2MultipartVideoUpload({
      objectKey: body.objectKey,
      uploadId: body.uploadId,
      parts: body.parts,
    });

    return NextResponse.json({ ok: true, provider: "r2", ...result });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[r2/upload/complete]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not complete R2 upload." },
      { status: 400 },
    );
  }
}
