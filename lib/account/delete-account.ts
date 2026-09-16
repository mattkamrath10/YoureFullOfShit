import "server-only";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2/client";
import { isR2Configured } from "@/lib/r2/config";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Deletes the auth user and profile. Entitlements cascade with the profile.
 * A later account with a new user id is a new identity (fresh free allowance).
 * Prevents lingering Plus on this user id. Does not rewrite lifetime counters
 * for this user — the row is removed with the profile.
 */
export async function deleteAccount(userId: string) {
  const service = createServiceClient();
  const { data: stories, error: storiesError } = await service.from("stories").select("id").eq("author_id", userId);
  if (storiesError) throw storiesError;
  const ids = (stories ?? []).map((story) => story.id);
  if (ids.length) {
    const { data: media, error } = await service.from("story_media").select("storage_path, storage_provider").in("story_id", ids);
    if (error) throw error;
    const r2 = (media ?? []).filter((item) => item.storage_provider === "r2").map((item) => item.storage_path);
    const storage = (media ?? []).filter((item) => item.storage_provider !== "r2").map((item) => item.storage_path);
    if (r2.length) {
      if (!isR2Configured()) throw new Error("R2 cleanup is unavailable.");
      const { client, config } = getR2Client();
      await client.send(new DeleteObjectsCommand({ Bucket: config.bucketName, Delete: { Objects: r2.map((Key) => ({ Key })) } }));
    }
    if (storage.length) { const { error: removeError } = await service.storage.from("story-media").remove(storage); if (removeError) throw removeError; }
    const { error: deleteStoriesError } = await service.from("stories").delete().in("id", ids);
    if (deleteStoriesError) throw deleteStoriesError;
  }
  const { error: profileError } = await service.from("profiles").delete().eq("id", userId);
  if (profileError) throw profileError;
  const { error: authError } = await service.auth.admin.deleteUser(userId);
  if (authError) throw authError;
}
