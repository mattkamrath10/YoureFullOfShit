/**
 * Large-video R2 must never be created before quota reservation succeeds.
 */
export async function createMultipartAfterReserve<T>(args: {
  reserve: () => Promise<void>;
  createMultipart: () => Promise<T>;
  release: () => Promise<void>;
  abortMultipart?: (created: T) => Promise<void>;
}): Promise<T> {
  await args.reserve();
  let created: T | undefined;
  try {
    created = await args.createMultipart();
    return created;
  } catch (error) {
    if (created && args.abortMultipart) {
      try {
        await args.abortMultipart(created);
      } catch {
        /* still release the quota reservation */
      }
    }
    await args.release();
    throw error;
  }
}
