import { db } from "@/db";
import { storyAssets } from "@/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { deleteObject } from "./storage";
import { sendTelegramNotification } from "./telegram";

/**
 * Purges items marked as isDeleted that are older than X days (default 30 days)
 * or purges ALL trash if forceAll is true.
 */
export async function purgeTrash(options?: {
  olderThanDays?: number;
  forceAll?: boolean;
}): Promise<{ purgedCount: number; errors: number }> {
  const forceAll = options?.forceAll ?? false;
  const days = options?.olderThanDays ?? 30;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Fetch trash records
  const query = forceAll
    ? eq(storyAssets.isDeleted, true)
    : and(eq(storyAssets.isDeleted, true), lt(storyAssets.deletedAt, cutoff));

  const itemsToPurge = await db.select().from(storyAssets).where(query);

  if (itemsToPurge.length === 0) {
    return { purgedCount: 0, errors: 0 };
  }

  let errors = 0;
  const idsToDelete: string[] = [];

  // 1. Delete physical files from Object Storage
  for (const item of itemsToPurge) {
    if (item.storageKey) {
      const ok = await deleteObject(item.storageKey);
      if (!ok) errors++;
    }
    idsToDelete.push(item.id);
  }

  // 2. Delete database records in bulk
  if (idsToDelete.length > 0) {
    await db.delete(storyAssets).where(inArray(storyAssets.id, idsToDelete));
  }

  // 3. Dispatch Telegram alert
  sendTelegramNotification({
    event: "TRASH_PURGED",
    appName: "MMS Studio Storage System",
    storyId: "CLEANUP_JOB",
    count: idsToDelete.length,
  }).catch((err) => console.warn("Telegram alert error:", err));

  return {
    purgedCount: idsToDelete.length,
    errors,
  };
}

/**
 * Restores a soft-deleted asset back to active status
 */
export async function restoreAsset(assetId: string): Promise<boolean> {
  const result = await db
    .update(storyAssets)
    .set({
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(storyAssets.id, assetId))
    .returning();

  return result.length > 0;
}

/**
 * Soft deletes an asset (moves to Trash)
 */
export async function softDeleteAsset(assetId: string): Promise<boolean> {
  const result = await db
    .update(storyAssets)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(storyAssets.id, assetId))
    .returning();

  return result.length > 0;
}
