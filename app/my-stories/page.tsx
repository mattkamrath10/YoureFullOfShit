import { createClient } from "@/lib/supabase/server";
import { isEmailAuthUser } from "@/lib/auth/session";
import { MyStoriesClient, type MyStoryRow } from "./MyStoriesClient";

export const dynamic = "force-dynamic";

export default async function MyStoriesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  // Guests / anonymous: render gate only (no story list leak via anon session).
  if (!auth.user || !isEmailAuthUser(auth.user)) {
    return <MyStoriesClient stories={[]} />;
  }

  const { data, error } = await supabase
    .from("stories")
    .select("id, title, preview, status, is_anonymous, created_at, rejection_reason, categories(name), story_media(id)")
    .eq("author_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Soft fail into empty list — never surface 42501 raw.
    return <MyStoriesClient stories={[]} />;
  }

  return <MyStoriesClient stories={(data ?? []) as MyStoryRow[]} />;
}
