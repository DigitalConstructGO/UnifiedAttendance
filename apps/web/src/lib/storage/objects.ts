import { DELIVERY_TYPE, RESOURCE_TYPE, cloudinary } from "./client";

/**
 * Delete a file from Cloudinary. A missing asset is treated as already
 * deleted, matching the idempotence the S3 delete used to have.
 */
export async function deleteFile(key: string): Promise<void> {
  const response = (await cloudinary.uploader.destroy(key, {
    resource_type: RESOURCE_TYPE,
    type: DELIVERY_TYPE,
    invalidate: true,
  })) as { result?: string };
  if (response.result !== "ok" && response.result !== "not found") {
    throw new Error(`Cloudinary refused to delete ${key}: ${response.result ?? "unknown error"}`);
  }
}
