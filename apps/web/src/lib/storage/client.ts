import { S3Client } from "@aws-sdk/client-s3";

/**
 * AWS S3 client for file storage
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
 */
export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

/** Default lifetime of a presigned URL, in seconds. */
export const DEFAULT_URL_TTL = 3600;
