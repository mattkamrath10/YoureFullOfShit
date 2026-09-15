import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getR2Client } from "@/lib/r2/client";
import { isR2Configured } from "@/lib/r2/config";

export const runtime = "nodejs";

export async function POST() {
  const session = await createClient();
  const { data: auth } = await session.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in to delete your account." }, { status: 401 });

  try {
    const service = createServiceClient();
    const { data: stories, error: storiesError } = await service
      .from("stories")
      .select("id")
      .eq("author_id", auth.user.id);
    if (storiesError) throw storiesError;

    const storyIds = (stories ?? []).map((story) => story.id);
    if (storyIds.length) {
      const { data: media, error: mediaError } = await service
        .from("story_media")
        .select("storage_path, storage_provider")
        .in("story_id", storyIds);
      if (mediaError) throw mediaError;

      const r2Keys = (media ?? []).filter((item) => item.storage_provider === "r2").map((item) => item.storage_path);
      const storagePaths = (media ?? []).filter((item) => item.storage_provider !== "r2").map((item) => item.storage_path);
      if (r2Keys.length) {
        if (!isR2Configured()) throw new Error("Account deletion cannot remove private video data because R2 is not configured. Contact support.");
        const { client, config } = getR2Client();
        for (let index = 0; index < r2Keys.length; index += 1000) {
          await client.send(new DeleteObjectsCommand({ Bucket: config.bucketName, Delete: { Objects: r2Keys.slice(index, index + 1000).map((Key) => ({ Key })) } }));
        }
      }
      if (storagePaths.length) {
        const { error } = await service.storage.from("story-media").remove(storagePaths);
        if (error) throw error;
      }
      const { error: deleteStoriesError } = await service.from("stories").delete().in("id", storyIds);
      if (deleteStoriesError) throw deleteStoriesError;
    }

    const { error: deleteProfileError } = await service.from("profiles").delete().eq("id", auth.user.id);
    if (deleteProfileError) throw deleteProfileError;
    const { error: deleteAuthError } = await service.auth.admin.deleteUser(auth.user.id);
    if (deleteAuthError) throw deleteAuthError;
    return Response.json({ deleted: true });
  } catch (cause) {
    console.error("[account/delete]", cause);
    return Response.json({ error: "Account deletion could not be completed. Some associated data may already have been removed; contact support if this continues." }, { status: 500 });
  }
}
