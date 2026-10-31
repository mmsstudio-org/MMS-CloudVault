"use server";

import { db } from "@/db";
import {
  siteSettings,
  apiKeys,
  mediaAssets,
  adminUsers,
  storageBuckets,
  ApiKey,
  StorageBucket,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { invalidateApiKeyCache } from "./api-cache";
import {
  purgeTrash,
  restoreAsset,
  softDeleteAsset,
  deleteAssetPermanently,
} from "./trash-manager";
import { sendTelegramNotification } from "./telegram";
import { processAndSaveAsset } from "./asset-manager";
import {
  invalidateClientPool,
  testBucketConnection,
  BucketTestResult,
} from "./storage-pool";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in test environments or CLI scripts without Next.js request context
  }
}

/**
 * Security Gate: Ensures that sensitive storage credentials and admin settings
 * are accessible strictly by authenticated and authorized admin users.
 */
async function requireAdminAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized: Admin authentication session required.");
  }

  const settings = await db.select().from(siteSettings).limit(1);
  let allowed: string[] = ["mr.sabbirmms@gmail.com"];
  if (settings[0]?.allowedAdminEmails) {
    try {
      allowed = JSON.parse(settings[0].allowedAdminEmails);
    } catch {
      allowed = [settings[0].allowedAdminEmails];
    }
  }

  if (!allowed.includes(session.user.email)) {
    throw new Error(
      "Forbidden: Your email is not authorized for administrative settings."
    );
  }

  return session.user;
}

// -----------------------------------------------------------------------------
// 1. ANALYTICS & METRICS
// -----------------------------------------------------------------------------
export async function getDashboardMetrics() {
  const [activeAssetsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaAssets)
    .where(eq(mediaAssets.isDeleted, false));

  const [storageMetrics] = await db
    .select({
      totalOptimizedKb: sql<number>`coalesce(sum(${mediaAssets.optimizedSizeKb}), 0)`,
      totalOriginalKb: sql<number>`coalesce(sum(${mediaAssets.originalSizeKb}), 0)`,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.isDeleted, false));

  const [trashCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaAssets)
    .where(eq(mediaAssets.isDeleted, true));

  const [appsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(apiKeys)
    .where(eq(apiKeys.isActive, true));

  const totalOptimizedMb = (
    Number(storageMetrics?.totalOptimizedKb || 0) / 1024
  ).toFixed(2);
  const totalOriginalMb = (
    Number(storageMetrics?.totalOriginalKb || 0) / 1024
  ).toFixed(2);
  const savedKb = Math.max(
    0,
    Number(storageMetrics?.totalOriginalKb || 0) -
      Number(storageMetrics?.totalOptimizedKb || 0)
  );
  const savedMb = (savedKb / 1024).toFixed(2);
  const savedPercent =
    Number(storageMetrics?.totalOriginalKb || 0) > 0
      ? Math.round(
          (savedKb / Number(storageMetrics.totalOriginalKb)) * 100
        )
      : 0;

  // Recent 6 assets
  const recentAssets = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.isDeleted, false))
    .orderBy(desc(mediaAssets.createdAt))
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
  const query = db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.isDeleted, false))
    .orderBy(desc(mediaAssets.updatedAt));

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
        a.assetId.toLowerCase().includes(q) ||
        (a.title && a.title.toLowerCase().includes(q))
    );
  }

  return filtered;
}

export async function actionSoftDeleteAsset(assetId: string) {
  const ok = await softDeleteAsset(assetId);
  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/gallery");
  safeRevalidate("/dashboard/trash");
  return ok;
}

export async function actionDeleteAssetPermanently(id: string) {
  const result = await deleteAssetPermanently(id);
  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/gallery");
  safeRevalidate("/dashboard/trash");
  return result;
}

/**
 * Bulk soft-deletes multiple media assets to trash.
 * Requires 2FA verification when user has 2FA enabled.
 */
export async function actionBulkSoftDeleteAssets(
  assetIds: string[],
  twoFactorCode?: string
) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Unauthorized: Administrator session required.");
  }

  // 1. Check if user has 2FA enabled, and verify code
  const { isUserTwoFactorEnabled, verifyUserTwoFactorChallenge } = await import("./totp");
  const is2FaEnabled = await isUserTwoFactorEnabled(session.user.email);
  if (is2FaEnabled) {
    if (!twoFactorCode || !twoFactorCode.trim()) {
      throw new Error("Two-Factor Authentication (2FA) code required for bulk delete operation.");
    }
    const isCodeValid = await verifyUserTwoFactorChallenge(session.user.email, twoFactorCode);
    if (!isCodeValid) {
      throw new Error("Invalid 2FA code or backup recovery code.");
    }
  }

  if (!assetIds || assetIds.length === 0) {
    return { success: true, count: 0 };
  }

  // 2. Perform bulk soft deletion
  let deletedCount = 0;
  for (const id of assetIds) {
    const ok = await softDeleteAsset(id);
    if (ok) deletedCount++;
  }

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/gallery");
  safeRevalidate("/dashboard/trash");
  return { success: true, count: deletedCount };
}

export async function actionUpdateAssetMetadata(
  id: string,
  data: { title?: string; folder?: string; uploaderName?: string; info?: string }
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: Administrator authentication required.");
  }

  const cleanTitle = data.title !== undefined ? data.title.trim() : undefined;
  const cleanFolder =
    data.folder !== undefined
      ? data.folder.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "general"
      : undefined;
  const cleanUploader =
    data.uploaderName !== undefined ? data.uploaderName.trim() : undefined;
  const cleanInfo =
    data.info !== undefined ? data.info.trim() : undefined;

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (cleanTitle !== undefined) updates.title = cleanTitle;
  if (cleanFolder !== undefined) updates.folder = cleanFolder;
  if (cleanUploader !== undefined) updates.uploaderName = cleanUploader || null;
  if (cleanInfo !== undefined) updates.info = cleanInfo || null;

  const [updated] = await db
    .update(mediaAssets)
    .set(updates)
    .where(eq(mediaAssets.id, id))
    .returning();

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/gallery");
  return updated;
}

// -----------------------------------------------------------------------------
// 3. TRASH ACTIONS
// -----------------------------------------------------------------------------
export async function getTrashAssets() {
  return db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.isDeleted, true))
    .orderBy(desc(mediaAssets.deletedAt));
}

export async function actionRestoreAsset(id: string) {
  const ok = await restoreAsset(id);
  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/gallery");
  safeRevalidate("/dashboard/trash");
  return ok;
}

export async function actionPurgeTrashNow() {
  const res = await purgeTrash({ forceAll: true });
  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/gallery");
  safeRevalidate("/dashboard/trash");
  return res;
}

// -----------------------------------------------------------------------------
// 4. STORAGE BUCKET MANAGEMENT (Strictly Admin-Secured)
// -----------------------------------------------------------------------------
export interface BucketWithAssetStats extends StorageBucket {
  assetCount: number;
  liveBytes: number;
}

/**
 * Returns all storage buckets along with live asset counts and real-time storage sizes.
 * Requires active admin authentication session.
 */
export async function actionGetStorageBuckets(): Promise<BucketWithAssetStats[]> {
  await requireAdminAuth();

  const buckets = await db
    .select()
    .from(storageBuckets)
    .orderBy(desc(storageBuckets.isDefault), desc(storageBuckets.createdAt));

  // Compute asset counts and live storage size per bucket from active media assets
  const stats = await db
    .select({
      bucketId: mediaAssets.bucketId,
      count: sql<number>`count(*)`,
      liveBytes: sql<number>`coalesce(sum(${mediaAssets.optimizedSizeKb} * 1024), 0)`,
    })
    .from(mediaAssets)
    .where(eq(mediaAssets.isDeleted, false))
    .groupBy(mediaAssets.bucketId);

  const statMap = new Map<string, { count: number; liveBytes: number }>();
  for (const s of stats) {
    if (s.bucketId) {
      statMap.set(s.bucketId, {
        count: Number(s.count),
        liveBytes: Number(s.liveBytes),
      });
    }
  }

  return buckets.map((b) => {
    const bucketStat = statMap.get(b.id);
    const calculatedBytes = bucketStat?.liveBytes || 0;
    const effectiveBytes = Math.max(Number(b.usedBytes || 0), calculatedBytes);

    return {
      ...b,
      usedBytes: effectiveBytes,
      liveBytes: effectiveBytes,
      assetCount: bucketStat?.count || 0,
    };
  });
}

/**
 * Creates a new storage bucket.
 * Requires admin session.
 */
export async function actionCreateStorageBucket(data: {
  name: string;
  slug: string;
  notes?: string;
  provider: string;
  endpoint: string;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
  isDefault?: boolean;
  isActive?: boolean;
  maxCapacityGb?: number;
}): Promise<StorageBucket> {
  await requireAdminAuth();

  const cleanSlug = data.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-").trim();

  // If set to default, demote existing default bucket
  if (data.isDefault) {
    await db
      .update(storageBuckets)
      .set({ isDefault: false })
      .where(eq(storageBuckets.isDefault, true));
  }

  const inserted = await db
    .insert(storageBuckets)
    .values({
      name: data.name.trim(),
      slug: cleanSlug,
      notes: data.notes?.trim() || null,
      provider: data.provider || "s3_compatible",
      endpoint: data.endpoint.trim(),
      bucketName: data.bucketName.trim(),
      region: data.region?.trim() || "auto",
      accessKeyId: data.accessKeyId.trim(),
      secretAccessKey: data.secretAccessKey.trim(),
      publicBaseUrl: data.publicBaseUrl?.trim() || null,
      isDefault: Boolean(data.isDefault),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      maxCapacityGb: Number(data.maxCapacityGb) || 5,
      usedBytes: 0,
    })
    .returning();

  invalidateClientPool();
  safeRevalidate("/dashboard/settings");
  safeRevalidate("/dashboard/api-keys");
  return inserted[0];
}

/**
 * Updates an existing storage bucket's configuration.
 */
export async function actionUpdateStorageBucket(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    notes: string | null;
    provider: string;
    endpoint: string;
    bucketName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicBaseUrl: string | null;
    isDefault: boolean;
    isActive: boolean;
    maxCapacityGb: number;
  }>
): Promise<StorageBucket> {
  await requireAdminAuth();

  if (data.isDefault) {
    await db
      .update(storageBuckets)
      .set({ isDefault: false })
      .where(eq(storageBuckets.isDefault, true));
  }

  // Ensure publicBaseUrl and notes can be explicitly cleared to null
  const updatePayload: Record<string, any> = {
    ...data,
    updatedAt: new Date(),
  };

  if ("publicBaseUrl" in data) {
    updatePayload.publicBaseUrl = data.publicBaseUrl && data.publicBaseUrl.trim() !== ""
      ? data.publicBaseUrl.trim()
      : null;
  }

  if ("notes" in data) {
    updatePayload.notes = data.notes && data.notes.trim() !== ""
      ? data.notes.trim()
      : null;
  }

  const updated = await db
    .update(storageBuckets)
    .set(updatePayload)
    .where(eq(storageBuckets.id, id))
    .returning();

  invalidateClientPool(id);
  safeRevalidate("/dashboard/settings");
  safeRevalidate("/dashboard/api-keys");
  return updated[0];
}

/**
 * Sets a specific storage bucket as the system default.
 */
export async function actionSetDefaultStorageBucket(id: string): Promise<boolean> {
  await requireAdminAuth();

  // Demote current default
  await db
    .update(storageBuckets)
    .set({ isDefault: false })
    .where(eq(storageBuckets.isDefault, true));

  // Promote chosen bucket
  await db
    .update(storageBuckets)
    .set({ isDefault: true, isActive: true, updatedAt: new Date() })
    .where(eq(storageBuckets.id, id));

  invalidateClientPool();
  safeRevalidate("/dashboard/settings");
  safeRevalidate("/dashboard/api-keys");
  return true;
}

/**
 * Deletes a storage bucket.
 * Protected: Cannot delete default bucket or buckets containing active assets.
 */
export async function actionDeleteStorageBucket(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireAdminAuth();

  const bucket = (
    await db.select().from(storageBuckets).where(eq(storageBuckets.id, id)).limit(1)
  )[0];

  if (!bucket) {
    return { success: false, error: "Bucket not found." };
  }

  if (bucket.isDefault) {
    return {
      success: false,
      error: "Cannot delete the active default storage bucket. Set another bucket as default first.",
    };
  }

  // Check if any active media assets reference this bucket
  const [assetCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaAssets)
    .where(eq(mediaAssets.bucketId, id));

  if (Number(assetCount?.count || 0) > 0) {
    return {
      success: false,
      error: `Cannot delete bucket: ${assetCount.count} media asset(s) are physically stored here. Migrate or purge assets before deleting.`,
    };
  }

  await db.delete(storageBuckets).where(eq(storageBuckets.id, id));
  invalidateClientPool(id);
  safeRevalidate("/dashboard/settings");
  safeRevalidate("/dashboard/api-keys");
  return { success: true };
}

/**
 * Live tests an S3/R2 storage bucket's connection.
 * Can test either an existing bucket by ID or raw test credentials from the modal.
 */
export async function actionTestStorageBucketConnection(params: {
  bucketId?: string;
  endpoint?: string;
  bucketName?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}): Promise<BucketTestResult> {
  await requireAdminAuth();

  let config: {
    endpoint: string;
    bucketName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };

  if (params.bucketId) {
    const bucket = (
      await db
        .select()
        .from(storageBuckets)
        .where(eq(storageBuckets.id, params.bucketId))
        .limit(1)
    )[0];

    if (!bucket) {
      return {
        ok: false,
        message: "Bucket configuration not found.",
        latencyMs: 0,
      };
    }

    config = {
      endpoint: bucket.endpoint,
      bucketName: bucket.bucketName,
      region: bucket.region,
      accessKeyId: bucket.accessKeyId,
      secretAccessKey: bucket.secretAccessKey,
    };
  } else {
    if (
      !params.endpoint ||
      !params.bucketName ||
      !params.accessKeyId ||
      !params.secretAccessKey
    ) {
      return {
        ok: false,
        message: "Missing required S3 credentials (endpoint, bucketName, accessKeyId, secretAccessKey).",
        latencyMs: 0,
      };
    }

    config = {
      endpoint: params.endpoint,
      bucketName: params.bucketName,
      region: params.region || "auto",
      accessKeyId: params.accessKeyId,
      secretAccessKey: params.secretAccessKey,
    };
  }

  return testBucketConnection(config);
}

// -----------------------------------------------------------------------------
// 5. API KEY MANAGEMENT
// -----------------------------------------------------------------------------
export async function getApiKeysList() {
  return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
}

export async function actionCreateApiKey(
  appName: string,
  appId: string,
  defaultBucketId?: string | null,
  imageBucketId?: string | null,
  audioBucketId?: string | null,
  enforceAppCheck?: boolean,
  firebaseProjectId?: string | null,
  allowedAppIds?: string | null,
  allowedDebugTokens?: string | null
) {
  const cleanAppId = appId.toLowerCase().replace(/[^a-z0-9_-]/g, "-").trim();
  const secretKey = `mms_sec_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

  const inserted = await db
    .insert(apiKeys)
    .values({
      appName: appName.trim(),
      appId: cleanAppId,
      secretKey,
      isActive: true,
      defaultBucketId: defaultBucketId || null,
      imageBucketId: imageBucketId || null,
      audioBucketId: audioBucketId || null,
      enforceAppCheck: Boolean(enforceAppCheck),
      firebaseProjectId: firebaseProjectId?.trim() || null,
      allowedAppIds: allowedAppIds?.trim() || null,
      allowedDebugTokens: allowedDebugTokens?.trim() || null,
    })
    .returning();

  invalidateApiKeyCache();
  safeRevalidate("/dashboard/api-keys");
  return inserted[0];
}

export async function actionUpdateApiKeySecurity(
  id: string,
  settings: {
    enforceAppCheck: boolean;
    firebaseProjectId?: string | null;
    allowedAppIds?: string | null;
    allowedDebugTokens?: string | null;
  }
) {
  const updated = await db
    .update(apiKeys)
    .set({
      enforceAppCheck: settings.enforceAppCheck,
      firebaseProjectId: settings.firebaseProjectId?.trim() || null,
      allowedAppIds: settings.allowedAppIds?.trim() || null,
      allowedDebugTokens: settings.allowedDebugTokens?.trim() || null,
    })
    .where(eq(apiKeys.id, id))
    .returning();

  if (updated.length > 0) {
    invalidateApiKeyCache(updated[0].secretKey);
  }
  safeRevalidate("/dashboard/api-keys");
  return updated[0];
}

export async function actionUpdateApiKeyBuckets(
  id: string,
  bindings: {
    defaultBucketId?: string | null;
    imageBucketId?: string | null;
    audioBucketId?: string | null;
  }
) {
  const updated = await db
    .update(apiKeys)
    .set({
      defaultBucketId: bindings.defaultBucketId || null,
      imageBucketId: bindings.imageBucketId || null,
      audioBucketId: bindings.audioBucketId || null,
    })
    .where(eq(apiKeys.id, id))
    .returning();

  if (updated.length > 0) {
    invalidateApiKeyCache(updated[0].secretKey);
  }
  safeRevalidate("/dashboard/api-keys");
  return updated[0];
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
  safeRevalidate("/dashboard/api-keys");
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
  safeRevalidate("/dashboard/api-keys");
  return updated[0];
}

export async function actionUpdateApiKeyDetails(
  id: string,
  data: { appName?: string }
) {
  await requireAdminAuth();
  const cleanName = data.appName?.trim();
  if (!cleanName) {
    throw new Error("Application name cannot be empty.");
  }

  const [updated] = await db
    .update(apiKeys)
    .set({
      appName: cleanName,
    })
    .where(eq(apiKeys.id, id))
    .returning();

  if (updated) {
    invalidateApiKeyCache(updated.secretKey);
  }
  safeRevalidate("/dashboard/api-keys");
  return updated;
}

export async function actionDeleteApiKey(id: string) {
  await requireAdminAuth();

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.id, id))
    .limit(1);

  if (!key) {
    throw new Error("API Key not found.");
  }

  if (key.appId === "general") {
    throw new Error("Cannot delete default global system application 'general'.");
  }

  // Safety Gate: Count active or soft-deleted media assets assigned to this appId
  const [assetCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mediaAssets)
    .where(eq(mediaAssets.appId, key.appId));

  const totalFiles = Number(assetCount?.count || 0);
  if (totalFiles > 0) {
    throw new Error(
      `Cannot delete API Key '${key.appName}' (${key.appId}). It still has ${totalFiles} file(s) stored under its namespace. Please delete or purge all files from this application first.`
    );
  }

  // Safe to delete since 0 files are attached
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  invalidateApiKeyCache(key.secretKey);
  safeRevalidate("/dashboard/api-keys");
  safeRevalidate("/dashboard/upload");
  return { success: true, deletedAppId: key.appId };
}

// -----------------------------------------------------------------------------
// 6. SITE SETTINGS ACTIONS
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
  await requireAdminAuth();

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
    await db
      .update(siteSettings)
      .set(payload)
      .where(eq(siteSettings.id, settings[0].id));
  } else {
    await db.insert(siteSettings).values(payload);
  }

  safeRevalidate("/dashboard/settings");
  safeRevalidate("/");
  return true;
}

export async function actionSendTestTelegram() {
  await requireAdminAuth();
  return sendTelegramNotification({
    event: "ASSET_UPLOADED",
    appName: "Test MMS Studio System",
    assetId: "test_verification_probe",
    title: "System Test Notification",
    folder: "system",
    uploaderName: "Sabbir MMS (Superadmin)",
    info: "Telegram notification diagnostic ping from settings portal",
    sizeKb: 120,
    savedKb: 45,
    publicUrl: "https://studio.sabbirmms.com",
  });
}

// -----------------------------------------------------------------------------
// 7. MANUAL WEB UPLOADER ACTION
// -----------------------------------------------------------------------------
export async function actionManualUpload(formData: FormData) {
  const file = formData.get("file") as File | null;
  const appId = (formData.get("app_id") as string | null)?.trim();
  const assetId = (formData.get("asset_id") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim() || undefined;
  const folder = (formData.get("folder") as string | null)?.trim() || "general";
  const targetBucketId =
    (formData.get("target_bucket_id") as string | null)?.trim() || undefined;

  if (!file || !appId || !assetId) {
    throw new Error("Missing required file, appId or assetId.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await processAndSaveAsset({
    appId,
    assetId,
    title,
    folder,
    buffer,
    appName: appId,
    fileName: file.name,
    mimeType: file.type,
    targetBucketId,
  });

  safeRevalidate("/dashboard");
  safeRevalidate("/dashboard/gallery");

  return {
    success: true,
    asset: result.asset,
    isReplaced: result.isReplaced,
    savedKb: result.savedKb,
  };
}
