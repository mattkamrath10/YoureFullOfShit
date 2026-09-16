import "server-only";

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/lib/r2/client";
import {
  assertAllowedVideoMime,
  getR2Config,
} from "@/lib/r2/config";
import { buildR2VideoObjectKey } from "@/lib/r2/keys";

/** ~8 MiB parts — well under typical proxy limits; fine for 100–500+ MB files */
export const R2_MULTIPART_PART_SIZE = 8 * 1024 * 1024;

export type CreateR2MultipartUploadInput = {
  ownerId: string;
  storyId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  /** When provided, quota reservation already chose this key — do not build another. */
  objectKey?: string;
};

export type CreateR2MultipartUploadResult = {
  bucket: string;
  objectKey: string;
  uploadId: string;
  partSize: number;
  partCount: number;
  /** Presigned PUT URLs for each part (1-based partNumber) */
  parts: Array<{ partNumber: number; url: string }>;
  expiresInSeconds: number;
};

/**
 * Start a multipart upload and return presigned URLs for every part.
 * Phase 1 foundation — not wired to /tell yet.
 */
export async function createR2MultipartVideoUpload(
  input: CreateR2MultipartUploadInput,
): Promise<CreateR2MultipartUploadResult> {
  const config = getR2Config();
  assertAllowedVideoMime(input.mimeType);

  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    throw new Error("Invalid file size.");
  }
  if (input.byteSize > config.maxVideoBytes) {
    throw new Error(
      `Video exceeds app maximum of ${Math.floor(config.maxVideoBytes / (1024 * 1024))} MB.`,
    );
  }

  const objectKey =
    input.objectKey ??
    buildR2VideoObjectKey({
      storyId: input.storyId,
      ownerId: input.ownerId,
      originalFileName: input.fileName,
    });
  if (input.objectKey) {
    assertObjectKeyShape(objectKey);
  }

  const { client } = getR2Client();
  const contentType = input.mimeType.toLowerCase().split(";")[0]!.trim();

  const created = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        storyid: input.storyId,
        ownerid: input.ownerId,
      },
    }),
  );

  if (!created.UploadId) {
    throw new Error("R2 did not return an upload id.");
  }

  try {
    const partCount = Math.max(1, Math.ceil(input.byteSize / R2_MULTIPART_PART_SIZE));
    const expiresInSeconds = 60 * 60;
    const parts: Array<{ partNumber: number; url: string }> = [];

    for (let partNumber = 1; partNumber <= partCount; partNumber++) {
      const command = new UploadPartCommand({
        Bucket: config.bucketName,
        Key: objectKey,
        UploadId: created.UploadId,
        PartNumber: partNumber,
      });
      const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      parts.push({ partNumber, url });
    }

    return {
      bucket: config.bucketName,
      objectKey,
      uploadId: created.UploadId,
      partSize: R2_MULTIPART_PART_SIZE,
      partCount,
      parts,
      expiresInSeconds,
    };
  } catch (error) {
    await client
      .send(
        new AbortMultipartUploadCommand({
          Bucket: config.bucketName,
          Key: objectKey,
          UploadId: created.UploadId,
        }),
      )
      .catch(() => undefined);
    throw error;
  }
}

export async function completeR2MultipartVideoUpload(args: {
  objectKey: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}): Promise<{ objectKey: string; bucket: string }> {
  const { client, config } = getR2Client();
  assertObjectKeyShape(args.objectKey);

  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: config.bucketName,
      Key: args.objectKey,
      UploadId: args.uploadId,
      MultipartUpload: {
        Parts: args.parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    }),
  );

  return { objectKey: args.objectKey, bucket: config.bucketName };
}

export async function abortR2MultipartVideoUpload(args: {
  objectKey: string;
  uploadId: string;
}): Promise<void> {
  const { client, config } = getR2Client();
  assertObjectKeyShape(args.objectKey);
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: config.bucketName,
      Key: args.objectKey,
      UploadId: args.uploadId,
    }),
  );
}

function assertObjectKeyShape(objectKey: string) {
  if (!objectKey.startsWith("stories/") || objectKey.includes("..")) {
    throw new Error("Invalid R2 object key.");
  }
}
