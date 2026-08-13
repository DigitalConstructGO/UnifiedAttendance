import {
  CLOUD_NAME,
  DEFAULT_URL_TTL,
  DELIVERY_TYPE,
  INCOMING_IMAGE_TRANSFORMATION,
  RESOURCE_TYPE,
  cloudinary,
  formatForContentType,
  isOptimizableImage,
} from "./client";


export function getUploadParams(
  key: string,
  options: { contentType: string },
): {
  uploadUrl: string;
  uploadFields: Record<string, string>;
} {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed: Record<string, string | number> = {
    public_id: key,
    timestamp,
    type: DELIVERY_TYPE,
  };
  if (isOptimizableImage(options.contentType)) {
    signed.transformation = INCOMING_IMAGE_TRANSFORMATION;
  }
  const signature = cloudinary.utils.api_sign_request(signed, process.env.CLOUDINARY_API_SECRET!);
  const { timestamp: _, ...fields } = signed;
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${RESOURCE_TYPE}/upload`,
    uploadFields: {
      ...Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, String(value)])),
      timestamp: String(timestamp),
      api_key: process.env.CLOUDINARY_API_KEY!,
      signature,
    },
  };
}

/**
 * Generate a time-limited signed URL for downloading a private asset.
 */
export function getDownloadUrl(
  key: string,
  options: {
    contentType: string;
    expiresIn?: number; // seconds, default 3600 (1 hour)
    attachment?: boolean;
  },
): string {
  return cloudinary.utils.private_download_url(key, formatForContentType(options.contentType), {
    resource_type: RESOURCE_TYPE,
    type: DELIVERY_TYPE,
    expires_at: Math.floor(Date.now() / 1000) + (options.expiresIn ?? DEFAULT_URL_TTL),
    attachment: options.attachment ?? false,
  });
}
