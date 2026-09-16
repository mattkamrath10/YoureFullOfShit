import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plusErrorMessage } from "@/lib/plus/errors";
import { createMultipartAfterReserve } from "@/lib/plus/r2-flow";
import { assertUserOwnsStory, requireAuthUser } from "@/lib/r2/auth";
import { isR2Configured } from "@/lib/r2/config";
import { buildR2VideoObjectKey } from "@/lib/r2/keys";
import { abortR2MultipartVideoUpload, createR2MultipartVideoUpload } from "@/lib/r2/upload";

export const runtime = "nodejs";

/**
 * POST /api/r2/upload/create
 * Sequence: authenticate → object key → reserve quota → then R2 multipart.
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

    const objectKey = buildR2VideoObjectKey({
      storyId,
      ownerId: user.id,
      originalFileName: fileName,
    });

    const supabase = await createClient();

    const result = await createMultipartAfterReserve({
      reserve: async () => {
        const { error } = await supabase.rpc("reserve_r2_upload", {
          p_story_id: storyId,
          p_byte_size: byteSize,
          p_object_key: objectKey,
        });
        if (error) {
          const mapped = plusErrorMessage(error);
          throw mapped
            ? new Response(JSON.stringify({ error: mapped.message, code: mapped.code }), {
                status: mapped.status,
                headers: { "Content-Type": "application/json" },
              })
            : error;
        }
      },
      createMultipart: () =>
        createR2MultipartVideoUpload({
          ownerId: user.id,
          storyId,
          fileName,
          mimeType,
          byteSize,
          objectKey,
        }),
      release: async () => {
        await supabase.rpc("release_r2_upload", { p_object_key: objectKey });
      },
      abortMultipart: async (created) => {
        await abortR2MultipartVideoUpload({
          objectKey: created.objectKey,
          uploadId: created.uploadId,
        });
      },
    });

    return NextResponse.json({
      provider: "r2",
      ...result,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    const mapped = plusErrorMessage(e instanceof Error ? e : null);
    if (mapped) {
      return NextResponse.json(
        { error: mapped.message, code: mapped.code },
        { status: mapped.status },
      );
    }
    console.error("[r2/upload/create]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start R2 upload." },
      { status: 400 },
    );
  }
}
