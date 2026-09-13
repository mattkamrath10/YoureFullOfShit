import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/lib/r2/client";
import { isR2Configured, getR2Config } from "@/lib/r2/config";
import { r2PublicObjectUrl } from "@/lib/r2/keys";

/**
 * Signed GET for private R2 objects (preferred for pending/moderation).
 * Falls back to public URL only when R2_PUBLIC_URL is set AND preferPublic is true.
 */
export async function getR2PlaybackUrl(
  objectKey: string,
  opts?: { expiresInSeconds?: number; preferPublic?: boolean },
): Promise<string | null> {
  if (!objectKey || objectKey.includes("..")) return null;
  if (!isR2Configured()) return null;

  const { client, config } = getR2Client();
  const preferPublic = Boolean(opts?.preferPublic && config.publicUrl);
  if (preferPublic) {
    return r2PublicObjectUrl(config.publicUrl, objectKey);
  }

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
  });
  return getSignedUrl(client, command, {
    expiresIn: opts?.expiresInSeconds ?? 60 * 60,
  });
}

export function getR2PublicBase(): string | null {
  if (!isR2Configured()) return null;
  try {
    return getR2Config().publicUrl;
  } catch {
    return null;
  }
}
