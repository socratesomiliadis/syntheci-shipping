import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerEnv } from "@syntheci/shared";

export function s3Client() {
  const env = getServerEnv();
  return new S3Client({
    region: "us-east-1",
    endpoint: env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

export async function createUploadUrl(input: {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
}) {
  const env = getServerEnv();
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.objectKey,
    ContentType: input.contentType,
    ContentLength: input.sizeBytes,
  });

  return getSignedUrl(s3Client(), command, { expiresIn: 900 });
}
