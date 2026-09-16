import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/r2/auth";
import { isR2Configured } from "@/lib/r2/config";
import { abortR2MultipartVideoUpload } from "@/lib/r2/upload";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

    try {
      await abortR2MultipartVideoUpload({
        objectKey: body.objectKey,
        uploadId: body.uploadId,
      });
    } catch (error) {
      console.error("[r2/upload/abort] multipart", error);
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("release_r2_upload", {
      p_object_key: body.objectKey,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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
