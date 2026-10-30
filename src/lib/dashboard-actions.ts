"use server";

import { db } from "@/db";
import { siteSettings, apiKeys, storyAssets, adminUsers, ApiKey } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateApiKeyCache } from "./api-cache";
import { purgeTrash, restoreAsset, softDeleteAsset } from "./trash-manager";
import { sendTelegramNotification } from "./telegram";
import { processAndSaveAsset } from "./asset-manager";

// -----------------------------------------------------------------------------
// 1. ANALYTICS & METRICS
// -----------------------------------------------------------------------------
export async function getDashboardMetrics() {
  const [activeAssetsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(storyAssets)
    .where(eq(storyAssets.isDeleted, false));

  const [storageMetrics] = await db
    .select({
      totalOptimizedKb: sql<number>`coalesce(sum(${storyAssets.optimizedSizeKb}), 0)`,
      totalOriginalKb: sql<number>`coalesce(sum(${storyAssets.originalSizeKb}), 0)`,
    })
    .from(storyAssets)
    .where(eq(storyAssets.isDeleted, false));

  const [trashCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(storyAssets)
    .where(eq(storyAssets.isDeleted, true));

  const [appsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(apiKeys)
    .where(eq(apiKeys.isActive, true));

  const totalOptimizedMb = (Number(storageMetrics?.totalOptimizedKb || 0) / 1024).toFixed(2);
  const totalOriginalMb = (Number(storageMetrics?.totalOriginalKb || 0) / 1024).toFixed(2);
  const savedKb = Math.max(
    0,
    Number(storageMetrics?.totalOriginalKb || 0) - Number(storageMetrics?.totalOptimizedKb || 0)
  );
  const savedMb = (savedKb / 1024).toFixed(2);
  const savedPercent =
    Number(storageMetrics?.totalOriginalKb || 0) > 0
      ? Math.round((savedKb / Number(storageMetrics.totalOriginalKb)) * 100)
      : 0;

  // Recent 6 assets
  const recentAssets = await db
    .select()
    .from(storyAssets)
    .where(eq(storyAssets.isDeleted, false))
    .orderBy(desc(storyAssets.createdAt))
    .limit(6);

  return {
    totalAssets: Number(activeAssetsCount?.count || 0),
    totalStorageMb: totalOptimizedMb,
    originalStorageMb: totalOriginalMb,
    savedStorageMb: savedMb,
    savedPercent,
    trashCount: Number(trashCount?.count || 0),
    appsCount: Number(appsCount?.count || 0),
    recentAssets,
  };
}

// -----------------------------------------------------------------------------
// 2. ASSET GALLERY ACTIONS
// -----------------------------------------------------------------------------
export async function getGalleryAssets(filters?: {
  appId?: string;
  folder?: string;
  search?: string;
}) {
  let query = db
    .select()
    .from(storyAssets)
    .where(eq(storyAssets.isDeleted, false))
    .orderBy(desc(storyAssets.updatedAt));

  const results = await query;

  let filtered = results;

  if (filters?.appId && filters.appId !== "ALL") {
    filtered = filtered.filter((a) => a.appId === filters.appId);
  }

  if (filters?.folder && filters.folder !== "ALL") {
    filtered = filtered.filter((a) => a.folder === filters.folder);
  }

  if (filters?.search && filters.search.trim() !== "") {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (a) =>
        a.storyId.toLowerCase().includes(q) ||
        (a.title && a.title.toLowerCase().includes(q))
    );
  }

  return filtered;
}

export async function actionSoftDeleteAsset(assetId: string) {
  const ok = await softDeleteAsset(assetId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/gallery");
  revalidatePath("/dashboard/trash");
  return ok;
}

// -----------------------------------------------------------------------------
// 3. TRASH ACTIONS
// -----------------------------------------------------------------------------
export async function getTrashAssets() {
  return db
    .select()
    .from(storyAssets)
    .where(eq(storyAssets.isDeleted, true))
    .orderBy(desc(storyAssets.deletedAt));
}

export async function actionRestoreAsset(assetId: string) {
  const ok = await restoreAsset(assetId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/gallery");
  revalidatePath("/dashboard/trash");
  return ok;
}

export async function actionPurgeTrashNow() {
  const res = await purgeTrash({ forceAll: true });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/gallery");
  revalidatePath("/dashboard/trash");
  return res;
}

// -----------------------------------------------------------------------------
// 4. API KEY MANAGEMENT
// -----------------------------------------------------------------------------
export async function getApiKeysList() {
  return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
}

export async function actionCreateApiKey(appName: string, appId: string) {
  const cleanAppId = appId.toLowerCase().replace(/[^a-z0-9_-]/g, "-").trim();
  const secretKey = `mms_sec_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

  const inserted = await db
    .insert(apiKeys)
    .values({
      appName: appName.trim(),
      appId: cleanAppId,
      secretKey,
      isActive: true,
    })
    .returning();

  invalidateApiKeyCache();
  revalidatePath("/dashboard/api-keys");
  return inserted[0];
}

export async function actionToggleApiKeyStatus(id: string, currentStatus: boolean) {
  const updated = await db
    .update(apiKeys)
    .set({
      isActive: !currentStatus,
      revokedAt: currentStatus ? new Date() : null,
    })
    .where(eq(apiKeys.id, id))
    .returning();

  if (updated.length > 0) {
    invalidateApiKeyCache(updated[0].secretKey);
  }
  revalidatePath("/dashboard/api-keys");
  return updated[0];
}

export async function actionRotateApiKey(id: string) {
  const newSecret = `mms_sec_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
  const key = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);

  if (key.length > 0) {
    invalidateApiKeyCache(key[0].secretKey);
  }

  const updated = await db
    .update(apiKeys)
    .set({
      secretKey: newSecret,
      isActive: true,
      revokedAt: null,
    })
    .where(eq(apiKeys.id, id))
    .returning();

  invalidateApiKeyCache(newSecret);
  revalidatePath("/dashboard/api-keys");
  return updated[0];
}

// -----------------------------------------------------------------------------
// 5. SITE SETTINGS ACTIONS
// -----------------------------------------------------------------------------
export async function getSiteSettingsData() {
  const settings = await db.select().from(siteSettings).limit(1);
  return settings[0];
}

export async function actionUpdateSiteSettings(data: {
  maxDimensionPx: number;
  maxFileKb: number;
  compressionQuality: number;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramNotificationsEnabled: boolean;
  googleSiteVerification?: string;
  googleSearchConsoleTag?: string;
  allowedAdminEmails: string[];
}) {
  const settings = await db.select().from(siteSettings).limit(1);

  const payload = {
    maxDimensionPx: Number(data.maxDimensionPx),
    maxFileKb: Number(data.maxFileKb),
    compressionQuality: Number(data.compressionQuality),
    telegramBotToken: data.telegramBotToken?.trim() || null,
    telegramChatId: data.telegramChatId?.trim() || null,
    telegramNotificationsEnabled: Boolean(data.telegramNotificationsEnabled),
    googleSiteVerification: data.googleSiteVerification?.trim() || null,
    googleSearchConsoleTag: data.googleSearchConsoleTag?.trim() || null,
    allowedAdminEmails: JSON.stringify(data.allowedAdminEmails),
    updatedAt: new Date(),
  };

  if (settings.length > 0) {
    await db.update(siteSettings).set(payload).where(eq(siteSettings.id, settings[0].id));
  } else {
    await db.insert(siteSettings).values(payload);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/");
  return true;
}

export async function actionSendTestTelegram() {
  return sendTelegramNotification({
    event: "ASSET_UPLOADED",
    appName: "Test MMS Studio System",
    storyId: "test_verification_probe",
    title: "System Test Notification",
    sizeKb: 120,
    savedKb: 45,
    publicUrl: "https://studio.sabbirmms.com",
  });
}

// -----------------------------------------------------------------------------
// 6. MANUAL WEB UPLOADER ACTION
// -----------------------------------------------------------------------------
export async function actionManualUpload(formData: FormData) {
  const file = formData.get("file") as File | null;
  const appId = (formData.get("app_id") as string | null)?.trim();
  const storyId = (formData.get("story_id") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim() || undefined;
  const folder = (formData.get("folder") as string | null)?.trim() || "general";

  if (!file || !appId || !storyId) {
    throw new Error("Missing required file, appId or storyId.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await processAndSaveAsset({
    appId,
    storyId,
    title,
    folder,
    buffer,
    appName: appId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/gallery");

  return {
    success: true,
    asset: result.asset,
    isReplaced: result.isReplaced,
    savedKb: result.savedKb,
  };
}
