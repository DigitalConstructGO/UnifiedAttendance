import {
  HeadObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3";

import { BUCKET_NAME, s3Client } from "./client";

/**
 * List files in a directory/prefix
 */
export async function listFiles(
  prefix?: string,
  options?: {
    maxKeys?: number;
    continuationToken?: string;
  },
): Promise<{
  files: { key: string; size?: number; lastModified?: Date }[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}> {
  const input: ListObjectsV2CommandInput = {
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: options?.maxKeys ?? 1000,
    ContinuationToken: options?.continuationToken,
  };

  const command = new ListObjectsV2Command(input);
  const response = await s3Client.send(command);

  return {
    files: (response.Contents ?? []).map((item) => ({
      key: item.Key!,
      size: item.Size,
      lastModified: item.LastModified,
    })),
    isTruncated: response.IsTruncated ?? false,
    nextContinuationToken: response.NextContinuationToken,
  };
}

/**
 * Check if a file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata without downloading the file
 */
export async function getFileMetadata(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  metadata?: Record<string, string>;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  } catch {
    return null;
  }
}
