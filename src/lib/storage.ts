import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { db } from "@/db";
import { storageBuckets, StorageBucket } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getS3ClientForBucket } from "./storage-pool";

/**
 * Resolves the primary default active storage bucket from the database.
 * The database is the Single Source of Truth (SSOT).
 */
export async function getDefaultActiveBucket(): Promise<StorageBucket> {
  // 1. Designated default active bucket
  const defaultBuckets = await db
    .select()
    .from(storageBuckets)
    .where(
      and(eq(storageBuckets.isDefault, true), eq(storageBuckets.isActive, true))
    )
    .limit(1);

  if (defaultBuckets.length > 0) {
    return defaultBuckets[0];
  }

  // 2. Any active bucket
  const activeBuckets = await db
    .select()
    .from(storageBuckets)
    .where(eq(storageBuckets.isActive, true))
    .limit(1);

  if (activeBuckets.length > 0) {
    return activeBuckets[0];
  }

  throw new Error(
    "No active storage bucket found in the system. Please register and activate a storage bucket in Settings."
  );
}

/**
 * Resolves a specific storage bucket by ID.
 */
export async function getBucketById(
  bucketId: string
): Promise<StorageBucket | null> {
  const records = await db
    .select()
    .from(storageBuckets)
    .where(eq(storageBuckets.id, bucketId))
    .limit(1);

  return records[0] || null;
}

/**
 * Uploads a buffer directly to the specified target StorageBucket.
 */
export async function uploadObjectToBucket(
  bucket: StorageBucket,
  buffer: Buffer,
  storageKey: string,
  contentType: string = "image/webp"
): Promise<{ publicUrl: string; storageKey: string }> {
  const s3Client = getS3ClientForBucket(bucket);

  const command = new PutObjectCommand({
    Bucket: bucket.bucketName,
    Key: storageKey,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await s3Client.send(command);

  // Determine delivery URL (Custom CDN domain takes precedence)
  const publicUrl = bucket.publicBaseUrl
    ? `${bucket.publicBaseUrl.replace(/\/$/, "")}/${storageKey}`
    : `${bucket.endpoint.replace(/\/$/, "")}/${bucket.bucketName}/${storageKey}`;

  // Increment bucket usage asynchronously
  db.update(storageBuckets)
    .set({
      usedBytes: sql`${storageBuckets.usedBytes} + ${buffer.length}`,
      updatedAt: new Date(),
    })
    .where(eq(storageBuckets.id, bucket.id))
    .catch((err) => console.warn("[Storage] Failed to update usedBytes:", err));

  return { publicUrl, storageKey };
}

/**
 * Permanently deletes an object from a specified StorageBucket.
 */
export async function deleteObjectFromBucket(
  bucket: StorageBucket,
  storageKey: string
): Promise<boolean> {
  try {
    const s3Client = getS3ClientForBucket(bucket);
    const command = new DeleteObjectCommand({
      Bucket: bucket.bucketName,
      Key: storageKey,
    });

    await s3Client.send(command);
    return true;
  } catch (err) {
    console.error(
      `[Storage Error] Failed to delete key "${storageKey}" from bucket "${bucket.name}":`,
      err
    );
    return false;
  }
}

/**
 * Helper to upload an object buffer, optionally targeting a specific bucketId.
 */
export async function uploadObject(
  buffer: Buffer,
  storageKey: string,
  contentType: string = "image/webp",
  bucketId?: string
): Promise<{ publicUrl: string; storageKey: string; bucket: StorageBucket }> {
  const bucket = bucketId
    ? (await getBucketById(bucketId)) || (await getDefaultActiveBucket())
    : await getDefaultActiveBucket();

  const result = await uploadObjectToBucket(
    bucket,
    buffer,
    storageKey,
    contentType
  );
  return { ...result, bucket };
}

/**
 * Helper to permanently delete an object, using a specific bucketId if provided.
 */
export async function deleteObject(
  storageKey: string,
  bucketId?: string
): Promise<boolean> {
  const bucket = bucketId
    ? (await getBucketById(bucketId)) || (await getDefaultActiveBucket())
    : await getDefaultActiveBucket();

  return deleteObjectFromBucket(bucket, storageKey);
}
