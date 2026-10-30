import { db } from "@/db";
import { mediaAssets, MediaAsset } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadObject, deleteObject } from "./storage";
import { optimizeImage, ImageOptimizationOptions } from "./image-optimizer";
import { sendTelegramNotification } from "./telegram";

export interface ProcessAssetParams {
  appId: string;
  assetId: string;
  title?: string;
  folder?: string;
  buffer: Buffer;
  options?: ImageOptimizationOptions;
  appName?: string;
  fileName?: string;
  mimeType?: string;
}

export async function processAndSaveAsset(
  params: ProcessAssetParams
): Promise<{
  asset: MediaAsset;
  isReplaced: boolean;
  savedKb: number;
}> {
  const { appId, assetId, title, folder = "general", buffer, options, appName } = params;

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
    // Detect audio extension & MIME type
    if (fileName.endsWith(".mp3") || inputMime === "audio/mpeg" || inputMime === "audio/mp3") {
      ext = "mp3";
      finalMime = "audio/mpeg";
    } else if (fileName.endsWith(".wav") || inputMime === "audio/wav") {
      ext = "wav";
      finalMime = "audio/wav";
    } else if (fileName.endsWith(".ogg") || inputMime === "audio/ogg") {
      ext = "ogg";
      finalMime = "audio/ogg";
    } else if (fileName.endsWith(".m4a") || inputMime === "audio/mp4" || inputMime === "audio/x-m4a") {
      ext = "m4a";
      finalMime = "audio/mp4";
    } else if (fileName.endsWith(".aac") || inputMime === "audio/aac") {
      ext = "aac";
      finalMime = "audio/aac";
    } else if (fileName.endsWith(".flac") || inputMime === "audio/flac") {
      ext = "flac";
      finalMime = "audio/flac";
    } else {
      ext = "mp3";
      finalMime = inputMime || "audio/mpeg";
    }

    uploadBuffer = buffer;
    originalSizeKb = Math.round(buffer.length / 1024) || 1;
    optimizedSizeKb = originalSizeKb;
    savedKb = 0;
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

  // 2. Generate unique storage key path
  const sanitizedFolder = folder.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || (isAudio ? "audio" : "general");
  const sanitizedAssetId = assetId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = Date.now();
  const storageKey = `apps/${appId}/${sanitizedFolder}/${sanitizedAssetId}-${timestamp}.${ext}`;

  // 3. Check for existing asset by composite key (appId + assetId)
  const existingRecords = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.appId, appId), eq(mediaAssets.assetId, assetId)))
    .limit(1);

  const existing = existingRecords[0];
  let isReplaced = false;

  if (existing) {
    isReplaced = true;
    // Remove previous physical asset from storage
    if (existing.storageKey) {
      await deleteObject(existing.storageKey);
    }
  }

  // 4. Upload buffer to Object Storage (or local storage fallback)
  const { publicUrl } = await uploadObject(
    uploadBuffer,
    storageKey,
    finalMime
  );

  let savedAsset: MediaAsset;

  // 5. Save or update database record
  if (existing) {
    const updated = await db
      .update(mediaAssets)
      .set({
        title: title || existing.title,
        folder: sanitizedFolder,
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
    const inserted = await db
      .insert(mediaAssets)
      .values({
        appId,
        assetId,
        title: title || `${isAudio ? "Audio" : "Asset"} for ${assetId}`,
        folder: sanitizedFolder,
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

  // 6. Trigger Telegram notification asynchronously (without blocking response)
  sendTelegramNotification({
    event: isReplaced ? "ASSET_REPLACED" : "ASSET_UPLOADED",
    appName: appName || appId,
    assetId,
    title: title || savedAsset.title || "",
    publicUrl,
    sizeKb: optimizedSizeKb,
    savedKb,
    mimeType: finalMime,
  }).catch((err) => console.warn("Telegram alert error:", err));

  return {
    asset: savedAsset,
    isReplaced,
    savedKb,
  };
}
