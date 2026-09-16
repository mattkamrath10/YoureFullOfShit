import assert from "node:assert/strict";
import test from "node:test";
import { createMultipartAfterReserve } from "./r2-flow.ts";

test("reserves before creating multipart", async () => {
  const order: string[] = [];
  const result = await createMultipartAfterReserve({
    reserve: async () => {
      order.push("reserve");
    },
    createMultipart: async () => {
      order.push("create");
      return { uploadId: "u1" };
    },
    release: async () => {
      order.push("release");
    },
  });
  assert.deepEqual(order, ["reserve", "create"]);
  assert.equal(result.uploadId, "u1");
});

test("releases reservation if multipart creation fails", async () => {
  const order: string[] = [];
  await assert.rejects(
    () =>
      createMultipartAfterReserve({
        reserve: async () => {
          order.push("reserve");
        },
        createMultipart: async () => {
          order.push("create");
          throw new Error("s3_failed");
        },
        release: async () => {
          order.push("release");
        },
      }),
    /s3_failed/,
  );
  assert.deepEqual(order, ["reserve", "create", "release"]);
});
