import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdminsOfNewStory } from "@/lib/admin/notify-new-story";

export const runtime = "nodejs";

/**
 * Called after a successful pending story insert.
 * Auth: session must own the story (or be admin). Never fails the submitter UX —
 * always returns 200 with { ok } so clients can fire-and-forget.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      storyId?: string;
    } | null;
    const storyId = body?.storyId?.trim();
    if (!storyId) {
      return NextResponse.json(
        { ok: false, error: "storyId_required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const { data: story, error } = await supabase
      .from("stories")
      .select("id, author_id, status")
      .eq("id", storyId)
      .maybeSingle();

    if (error || !story) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }

    if (story.status !== "pending") {
      return NextResponse.json({ ok: true, skipped: "not_pending" });
    }

    const isAuthor = story.author_id === auth.user.id;
    if (!isAuthor) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (!profile?.is_admin) {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 },
        );
      }
    }

    const result = await notifyAdminsOfNewStory(storyId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[admin-notify] route error", e);
    // Do not 500 in a way that worries the client — submission already succeeded.
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "notify_failed",
    });
  }
}
