import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Private course-asset storage on any S3-compatible service (Cloudflare R2, AWS S3, MinIO...).
 * Env: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION (default "auto").
 */
let client: S3Client | null = null;

function config() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Private object storage is not configured (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).");
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function getClient() {
  if (client) return client;
  const c = config();
  client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: c.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return client;
}

function objectKey(storageKey: string) {
  if (!storageKey.startsWith("/objects/course-assets/")) {
    throw new Error("Invalid course asset path.");
  }
  return storageKey.slice("/objects/".length);
}

export async function signCourseAssetUpload(storageKey: string, ttlSeconds: number) {
  const { bucket } = config();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucket, Key: objectKey(storageKey) }),
    { expiresIn: ttlSeconds },
  );
  return { uploadUrl, expiresAt };
}

export async function getCourseAssetMetadata(storageKey: string) {
  const { bucket } = config();
  try {
    const head = await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey(storageKey) }));
    return { sizeBytes: Number(head.ContentLength ?? 0), mimeType: head.ContentType ?? null };
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw error;
  }
}

/** Short-lived read URL for private playback/download of an asset. */
export async function signCourseAssetRead(storageKey: string, ttlSeconds: number) {
  const { bucket } = config();
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: objectKey(storageKey) }), {
    expiresIn: ttlSeconds,
  });
}
