import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { BUCKET_NAME, DEFAULT_URL_TTL, s3Client } from "./client";

/**
 * Generate a presigned URL for uploading a file
 */
export async function getUploadUrl(
  key: string,
  options?: {
    expiresIn?: number; // seconds, default 3600 (1 hour)
    contentType?: string;
  },
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: options?.contentType,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: options?.expiresIn ?? DEFAULT_URL_TTL,
  });
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function getDownloadUrl(
  key: string,
  options?: {
    expiresIn?: number; // seconds, default 3600 (1 hour)
    responseContentDisposition?: string;
  },
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: options?.responseContentDisposition,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: options?.expiresIn ?? DEFAULT_URL_TTL,
  });
}

/**
 * Get the public URL for a file (only works if bucket/file has public access)
 */
export function getPublicUrl(key: string): string {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
}
