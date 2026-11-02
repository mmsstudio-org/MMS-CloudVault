import { scheduleStorageCleanup } from "@/lib/storage-cleanup";
import { db } from "@/db";
import { mediaAssets, MediaAsset, ApiKey, StorageBucket } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  uploadObjectToBucket,
  deleteObjectFromBucket,
  getDefaultActiveBucket,
  getBucketById,
} from "./storage";
import { optimizeImage, ImageOptimizationOptions } from "./image-optimizer";
import { optimizeAudio, AudioOptimizationOptions } from "./audio-optimizer";
import { enqueueTelegramNotification, drainTelegramOutbox } from "./telegram";

export interface ProcessAssetParams {
  appId: string;
  assetId: string;
  title?: string;
  folder?: string;
  uploaderName?: string;
  info?: string;
  buffer: Buffer;
  options?: ImageOptimizationOptions;
  audioOptions?: AudioOptimizationOptions;
  appName?: string;
  fileName?: string;
  mimeType?: string;
  apiKey?: ApiKey;
  targetBucketId?: string;
}

export async function processAndSaveAsset(
  params: ProcessAssetParams
): Promise<{
  asset: MediaAsset;
  isReplaced: boolean;
  savedKb: number;
  bucket: StorageBucket;
}> {
  const {
    appId,
    assetId,
    title,
    folder = "general",
    uploaderName,
    info,
    buffer,
    options,
    audioOptions,
    appName,
    apiKey,
    targetBucketId,
  } = params;

  if (!assetId) {
    throw new Error("Asset ID is required.");
  }

  const fileName = params.fileName?.toLowerCase() || "";
  const inputMime = params.mimeType?.toLowerCase() || "";

  const isAudio =
    inputMime.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName);

  let ext = "webp";
  let finalMime = "image/webp";
  let uploadBuffer: Buffer;
  let originalSizeKb = Math.round(buffer.length / 1024) || 1;
  let optimizedSizeKb = originalSizeKb;
  let width = 0;
  let height = 0;
  let blurHash: string | null = null;
  let savedKb = 0;

  if (isAudio) {
    // Process / Optimize Audio (Optionally compresses or preserves 100% original fidelity)
    const audioResult = await optimizeAudio(
      buffer,
      fileName,
      inputMime,
      audioOptions
    );

    uploadBuffer = audioResult.optimizedBuffer;
    originalSizeKb = audioResult.originalSizeKb;
    optimizedSizeKb = audioResult.optimizedSizeKb;
    savedKb = audioResult.savedKb;
    ext = audioResult.ext;
    finalMime = audioResult.mimeType;
  } else {
    // 1. Optimize image through Sharp engine & compute BlurHash
    const optimized = await optimizeImage(buffer, options);
    uploadBuffer = optimized.optimizedBuffer;
    originalSizeKb = optimized.originalSizeKb;
    optimizedSizeKb = optimized.optimizedSizeKb;
    width = optimized.width;
    height = optimized.height;
    blurHash = optimized.blurHash;
    savedKb = Math.max(0, originalSizeKb - optimizedSizeKb);
    ext = "webp";
    finalMime = optimized.mimeType;
  }

  // 2. Resolve Target Storage Bucket based on MIME-Type & API Key / App settings
  let targetBucket: StorageBucket | null = null;

  if (targetBucketId) {
    targetBucket = await getBucketById(targetBucketId);
  }

  if (!targetBucket && apiKey) {
    // Granular routing overrides
    if (isAudio && apiKey.audioBucketId) {
      targetBucket = await getBucketById(apiKey.audioBucketId);
    } else if (!isAudio && apiKey.imageBucketId) {
      targetBucket = await getBucketById(apiKey.imageBucketId);
    }

    // Default bucket for this API key
    if (!targetBucket && apiKey.defaultBucketId) {
      targetBucket = await getBucketById(apiKey.defaultBucketId);
    }
  }

  // Fallback to system default active bucket
  if (!targetBucket) {
    targetBucket = await getDefaultActiveBucket();
  }

  // 3. Generate structured storage key path with media-type folder
  const mediaCategory = isAudio ? "audio" : "images";
  const sanitizedFolder =
    folder.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "general";
  const sanitizedAssetId = assetId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = crypto.randomUUID();
  const storageKey = `apps/${appId}/${mediaCategory}/${sanitizedFolder}/${sanitizedAssetId}-${timestamp}.${ext}`;

  await scheduleStorageCleanup(db, targetBucket.id, storageKey, 86400);

  // 5. Upload buffer to the target Object Storage bucket
  const { publicUrl } = await uploadObjectToBucket(
    targetBucket,
    uploadBuffer,
    storageKey,
    finalMime
  );

  const { savedAsset, existing, isReplaced } = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([appId, assetId])}, 0))`);
  // 4. Check for existing asset by composite key (appId + assetId)
  const existingRecords = await tx
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.appId, appId), eq(mediaAssets.assetId, assetId)))
    .limit(1);

  const existing = existingRecords[0];
  const isReplaced = !!existing;

  let savedAsset: MediaAsset;

  // 6. Save or update database record
  if (existing) {
    const updated = await tx
      .update(mediaAssets)
      .set({
        bucketId: targetBucket.id,
        title: title || existing.title,
        folder: sanitizedFolder,
        uploaderName: uploaderName !== undefined ? uploaderName : existing.uploaderName,
        info: info !== undefined ? info : existing.info,
        storageKey,
        publicUrl,
        blurHash,
        originalSizeKb,
        optimizedSizeKb,
        width,
        height,
        mimeType: finalMime,
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, existing.id))
      .returning();

    savedAsset = updated[0];
  } else {
    const inserted = await tx
      .insert(mediaAssets)
      .values({
        appId,
        assetId,
        bucketId: targetBucket.id,
        title: title || `${isAudio ? "Audio" : "Asset"} for ${assetId}`,
        folder: sanitizedFolder,
        uploaderName: uploaderName || null,
        info: info || null,
        storageKey,
        publicUrl,
        blurHash,
        originalSizeKb,
        optimizedSizeKb,
        width,
        height,
        mimeType: finalMime,
        isDeleted: false,
      })
      .returning();

    savedAsset = inserted[0];
  }

    if (existing?.bucketId && existing.storageKey !== storageKey) {
      await scheduleStorageCleanup(tx, existing.bucketId, existing.storageKey);
    }
    await enqueueTelegramNotification(tx, {
    eventKey: `upload:${appId}:${assetId}:${storageKey}`,
      event: isReplaced ? "ASSET_REPLACED" : "ASSET_UPLOADED",
    appName: appName || appId,
    assetId,
    title: title || savedAsset.title || "",
    uploaderName: uploaderName || savedAsset.uploaderName || null,
    info: info || savedAsset.info || null,
    folder: folder || savedAsset.folder || "general",
    publicUrl,
    sizeKb: optimizedSizeKb,
    savedKb,
    mimeType: finalMime,
  });
    return { savedAsset, existing, isReplaced };
  }).catch(async (error) => {
    await deleteObjectFromBucket(targetBucket, storageKey).catch(() => {});
    throw error;
  });

  // Keep the old object until the replacement and database write succeed.
  if (existing?.storageKey && existing.storageKey !== storageKey) {
    const oldBucket = existing.bucketId ? await getBucketById(existing.bucketId) : targetBucket;
    if (oldBucket) await deleteObjectFromBucket(oldBucket, existing.storageKey).catch((error) => console.warn("Old asset cleanup failed", error));
  }

  // 7. Trigger Telegram notification asynchronously (without blocking response)
  await drainTelegramOutbox(1).catch((error) => console.warn("Telegram worker deferred", error));

  return {
    asset: savedAsset,
    isReplaced,
    savedKb,
    bucket: targetBucket,
  };
}
