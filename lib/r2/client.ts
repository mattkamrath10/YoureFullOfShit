import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { getR2Config, type R2Config } from "@/lib/r2/config";

let cached: { key: string; client: S3Client; config: R2Config } | null = null;

function cacheKey(cfg: R2Config): string {
  return `${cfg.endpoint}|${cfg.bucketName}|${cfg.accessKeyId}`;
}

/**
 * S3-compatible client pointed at Cloudflare R2.
 * Server-only — never import from Client Components.
 */
export function getR2Client(): { client: S3Client; config: R2Config } {
  const config = getR2Config();
  const key = cacheKey(config);
  if (cached && cached.key === key) {
    return { client: cached.client, config: cached.config };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: false,
  });

  cached = { key, client, config };
  return { client, config };
}
