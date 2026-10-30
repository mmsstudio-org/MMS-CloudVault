import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
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
    ? eq(mediaAssets.isDeleted, true)
    : and(eq(mediaAssets.isDeleted, true), lt(mediaAssets.deletedAt, cutoff));

  const itemsToPurge = await db.select().from(mediaAssets).where(query);

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
    await db.delete(mediaAssets).where(inArray(mediaAssets.id, idsToDelete));
  }

  // 3. Dispatch Telegram alert
  sendTelegramNotification({
    event: "TRASH_PURGED",
    appName: "MMS Studio Storage System",
    assetId: "CLEANUP_JOB",
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
export async function restoreAsset(id: string): Promise<boolean> {
  const result = await db
    .update(mediaAssets)
    .set({
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(mediaAssets.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Soft deletes an asset (moves to Trash)
 */
export async function softDeleteAsset(id: string): Promise<boolean> {
  const result = await db
    .update(mediaAssets)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(mediaAssets.id, id))
    .returning();

  return result.length > 0;
}
