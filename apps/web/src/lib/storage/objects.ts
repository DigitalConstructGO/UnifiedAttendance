import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type GetObjectCommandInput,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import { BUCKET_NAME, s3Client } from "./client";

/**
 * Upload a file to S3
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string | ReadableStream,
  options?: {
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: "private" | "public-read";
  },
): Promise<{ key: string; etag?: string }> {
  const input: PutObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: options?.contentType,
    Metadata: options?.metadata,
    ACL: options?.acl,
  };

  const command = new PutObjectCommand(input);
  const response = await s3Client.send(command);

  return {
    key,
    etag: response.ETag,
  };
}

/**
 * Download a file from S3
 */
export async function downloadFile(key: string): Promise<{
  body: ReadableStream | null;
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}> {
  const input: GetObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  const command = new GetObjectCommand(input);
  const response = await s3Client.send(command);

  return {
    body: response.Body?.transformToWebStream() ?? null,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    metadata: response.Metadata,
  };
}

/**
 * Download file as Buffer
 */
export async function downloadFileAsBuffer(key: string): Promise<Buffer> {
  const input: GetObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  const command = new GetObjectCommand(input);
  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`File not found: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Delete multiple files from S3
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteFile(key)));
}

/**
 * Copy a file within S3
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string,
): Promise<{ key: string; etag?: string }> {
  const command = new CopyObjectCommand({
    Bucket: BUCKET_NAME,
    CopySource: `${BUCKET_NAME}/${sourceKey}`,
    Key: destinationKey,
  });

  const response = await s3Client.send(command);

  return {
    key: destinationKey,
    etag: response.CopyObjectResult?.ETag,
  };
}

/**
 * Move a file within S3 (copy then delete)
 */
export async function moveFile(
  sourceKey: string,
  destinationKey: string,
): Promise<{ key: string; etag?: string }> {
  const result = await copyFile(sourceKey, destinationKey);
  await deleteFile(sourceKey);
  return result;
}
