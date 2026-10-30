import { db } from "@/db";
import { mediaAssets, MediaAsset } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadObject, deleteObject } from "./storage";
import { optimizeImage, ImageOptimizationOptions } from "./image-optimizer";
import { sendTelegramNotification } from "./telegram";

export interface ProcessAssetParams {
  appId: string;
  assetId?: string;
  storyId?: string; // backward-compatibility alias
  title?: string;
  folder?: string;
  buffer: Buffer;
  options?: ImageOptimizationOptions;
  appName?: string;
}

export async function processAndSaveAsset(
  params: ProcessAssetParams
): Promise<{
  asset: MediaAsset;
  isReplaced: boolean;
  savedKb: number;
}> {
  const { appId, title, folder = "general", buffer, options, appName } = params;
  const assetId = params.assetId || params.storyId;

  if (!assetId) {
    throw new Error("Asset ID is required.");
  }

  // 1. Optimize image through Sharp engine & compute BlurHash
  const optimized = await optimizeImage(buffer, options);

  // 2. Generate unique storage key path
  const sanitizedFolder = folder.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "general";
  const sanitizedAssetId = assetId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = Date.now();
  const storageKey = `apps/${appId}/${sanitizedFolder}/${sanitizedAssetId}-${timestamp}.webp`;

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

  // 4. Upload optimized buffer to Object Storage (or local storage fallback)
  const { publicUrl } = await uploadObject(
    optimized.optimizedBuffer,
    storageKey,
    optimized.mimeType
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
        blurHash: optimized.blurHash,
        originalSizeKb: optimized.originalSizeKb,
        optimizedSizeKb: optimized.optimizedSizeKb,
        width: optimized.width,
        height: optimized.height,
        mimeType: optimized.mimeType,
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
        title: title || `Asset for ${assetId}`,
        folder: sanitizedFolder,
        storageKey,
        publicUrl,
        blurHash: optimized.blurHash,
        originalSizeKb: optimized.originalSizeKb,
        optimizedSizeKb: optimized.optimizedSizeKb,
        width: optimized.width,
        height: optimized.height,
        mimeType: optimized.mimeType,
        isDeleted: false,
      })
      .returning();

    savedAsset = inserted[0];
  }

  const savedKb = Math.max(0, optimized.originalSizeKb - optimized.optimizedSizeKb);

  // 6. Trigger Telegram notification asynchronously (without blocking response)
  sendTelegramNotification({
    event: isReplaced ? "ASSET_REPLACED" : "ASSET_UPLOADED",
    appName: appName || appId,
    assetId,
    title: title || savedAsset.title || "",
    publicUrl,
    sizeKb: optimized.optimizedSizeKb,
    savedKb,
  }).catch((err) => console.warn("Telegram alert error:", err));

  return {
    asset: savedAsset,
    isReplaced,
    savedKb,
  };
}
