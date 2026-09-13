import { NextResponse } from "next/server";
import { assertUserOwnsStory, requireAuthUser } from "@/lib/r2/auth";
import { isR2Configured } from "@/lib/r2/config";
import { createR2MultipartVideoUpload } from "@/lib/r2/upload";

export const runtime = "nodejs";

/**
 * POST /api/r2/upload/create
 * Email (free account) only — guests/anonymous cannot start R2 uploads.
 *
 * Body: { storyId, fileName, mimeType, byteSize }
 */
export async function POST(req: Request) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          error: "R2 is not configured on this environment yet.",
          code: "R2_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const user = await requireAuthUser();
    const body = (await req.json()) as {
      storyId?: string;
      fileName?: string;
      mimeType?: string;
      byteSize?: number;
    };

    const storyId = body.storyId?.trim() ?? "";
    const fileName = body.fileName?.trim() ?? "";
    const mimeType = body.mimeType?.trim() ?? "";
    const byteSize = Number(body.byteSize);

    if (!storyId || !fileName || !mimeType || !Number.isFinite(byteSize)) {
      return NextResponse.json(
        { error: "storyId, fileName, mimeType, and byteSize are required." },
        { status: 400 },
      );
    }

    await assertUserOwnsStory({ userId: user.id, storyId });

    const result = await createR2MultipartVideoUpload({
      ownerId: user.id,
      storyId,
      fileName,
      mimeType,
      byteSize,
    });

    return NextResponse.json({
      provider: "r2",
      ...result,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[r2/upload/create]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start R2 upload." },
      { status: 400 },
    );
  }
}
