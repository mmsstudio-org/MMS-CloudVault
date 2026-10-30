import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

// Initialize S3 / R2 Client if credentials exist
const endpoint = process.env.STORAGE_ENDPOINT;
const accessKeyId = process.env.STORAGE_ACCESS_KEY;
const secretAccessKey = process.env.STORAGE_SECRET_KEY;
const bucketName = process.env.STORAGE_BUCKET_NAME || "mms-studio-storage";
const region = process.env.STORAGE_REGION || "auto";
const publicBaseUrl = process.env.STORAGE_PUBLIC_URL;

const hasCloudStorage = Boolean(endpoint && accessKeyId && secretAccessKey);

let s3Client: S3Client | null = null;
if (hasCloudStorage) {
  s3Client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
    // Required for Cloudflare R2 and generic S3 compatibles
    forcePathStyle: true,
  });
}

/**
 * Uploads a buffer to Cloudflare R2 / AWS S3, or falls back to public/uploads in local dev
 */
export async function uploadObject(
  buffer: Buffer,
  storageKey: string,
  contentType: string = "image/webp"
): Promise<{ publicUrl: string; storageKey: string }> {
  if (hasCloudStorage && s3Client) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await s3Client.send(command);

    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, "")}/${storageKey}`
      : `${endpoint?.replace(/\/$/, "")}/${bucketName}/${storageKey}`;

    return { publicUrl, storageKey };
  }

  // Local fallback: write to public/uploads
  const localDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(localDir, storageKey);
  const dirPath = path.dirname(filePath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = `${baseUrl.replace(/\/$/, "")}/uploads/${storageKey}`;

  return { publicUrl, storageKey };
}

/**
 * Deletes an object from Cloudflare R2 / S3 or local disk
 */
export async function deleteObject(storageKey: string): Promise<boolean> {
  try {
    if (hasCloudStorage && s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
      });
      await s3Client.send(command);
      return true;
    }

    // Local fallback
    const filePath = path.join(process.cwd(), "public", "uploads", storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (err) {
    console.error(`Failed to delete storage key: ${storageKey}`, err);
    return false;
  }
}

/**
 * Formats public URL for a given key
 */
export function getPublicUrl(storageKey: string): string {
  if (hasCloudStorage && publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${storageKey}`;
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/uploads/${storageKey}`;
}
