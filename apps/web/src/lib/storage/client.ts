import { v2 as cloudinary } from "cloudinary";

export { cloudinary };

export const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;

export const DEFAULT_URL_TTL = 3600;

/**
 * Every document this system accepts (PDF, JPG, PNG, WebP) is stored under
 * Cloudinary's `image` resource type — Cloudinary treats PDFs as images —
 * and as `type: "private"`, so assets are never publicly deliverable.
 */
export const RESOURCE_TYPE = "image";
export const DELIVERY_TYPE = "private";

const FORMAT_BY_CONTENT_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const CONTENT_TYPE_BY_FORMAT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function formatForContentType(contentType: string) {
  const format = FORMAT_BY_CONTENT_TYPE[contentType];
  if (!format) throw new Error(`Unsupported document content type: ${contentType}`);
  return format;
}

export const INCOMING_IMAGE_TRANSFORMATION = "c_limit,w_2500,h_2500,q_auto:good";

export function isOptimizableImage(contentType: string) {
  return contentType !== "application/pdf" && contentType in FORMAT_BY_CONTENT_TYPE;
}

export function contentTypeForFormat(format: string | undefined) {
  return format ? CONTENT_TYPE_BY_FORMAT[format] : undefined;
}
