import { DELIVERY_TYPE, RESOURCE_TYPE, cloudinary, contentTypeForFormat } from "./client";

/**
 * Get file metadata without downloading the file. Returns null when the asset
 * does not exist — the caller treats that as "upload never happened".
 */
export async function getFileMetadata(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
} | null> {
  try {
    const resource = (await cloudinary.api.resource(key, {
      resource_type: RESOURCE_TYPE,
      type: DELIVERY_TYPE,
    })) as { format?: string; bytes?: number };
    return {
      contentType: contentTypeForFormat(resource.format),
      contentLength: resource.bytes,
    };
  } catch {
    return null;
  }
}
