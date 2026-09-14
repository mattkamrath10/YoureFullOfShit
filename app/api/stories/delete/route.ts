import { isEmailAuthUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let storyId: unknown;
  try {
    ({ storyId } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof storyId !== "string" || !storyId.trim()) {
    return Response.json({ error: "A story is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth.user;
  if (authError || !isEmailAuthUser(user)) {
    return Response.json({ error: "Sign in to delete a story." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = Boolean(profile?.is_admin);

  // RLS limits this lookup to the author or an admin. The explicit check keeps
  // the route's authorization clear even if the policy is changed later.
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, author_id")
    .eq("id", storyId.trim())
    .maybeSingle();

  if (storyError || !story || (!isAdmin && story.author_id !== user.id)) {
    return Response.json({ error: "Story not found." }, { status: 404 });
  }

  // The database delete policy enforces the same owner/admin rule. Related
  // rows with story foreign keys are removed by their ON DELETE CASCADE rules.
  const { error: deleteError } = await supabase
    .from("stories")
    .delete()
    .eq("id", story.id);

  if (deleteError) {
    return Response.json(
      { error: "Could not delete this story. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ deleted: true });
}
