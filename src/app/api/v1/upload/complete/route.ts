import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-cache";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sendTelegramNotification } from "@/lib/telegram";
import { deleteObject, headObject } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate API Key
    const apiKeyHeader =
      req.headers.get("x-api-key") ||
      req.headers.get("X-API-KEY") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const auth = await validateApiKey(apiKeyHeader);
    if (!auth.isValid || !auth.app) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or inactive API Key provided in x-api-key header.",
        },
        { status: 401 }
      );
    }

    const { appId, appName } = auth.app;

    // 2. Parse payload
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Bad Request: JSON body required." },
        { status: 400 }
      );
    }

    const assetId = typeof body.asset_id === "string" ? body.asset_id.trim() : "";
    const storageKey = typeof body.storage_key === "string" ? body.storage_key.trim() : "";
    const publicUrl = typeof body.public_url === "string" ? body.public_url.trim() : "";
    const bucketId = typeof body.bucket_id === "string" ? body.bucket_id.trim() : undefined;
    const folder = typeof body.folder === "string" ? body.folder.trim().toLowerCase() : "general";
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const uploaderName = typeof body.uploader_name === "string" ? body.uploader_name.trim() : undefined;
    const info = typeof body.info === "string" ? body.info.trim() : undefined;
    const mimeType = typeof body.mime_type === "string" ? body.mime_type.trim() : "application/octet-stream";
    const fileSizeKb = typeof body.file_size_kb === "number" ? Math.round(body.file_size_kb) : 0;
    const width = typeof body.width === "number" ? Math.round(body.width) : 0;
    const height = typeof body.height === "number" ? Math.round(body.height) : 0;

    if (!assetId || !storageKey || !publicUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: 'asset_id', 'storage_key', and 'public_url' are required.",
        },
        { status: 400 }
      );
    }

    // 2.5 Query storage directly to get actual file size and verify object exists
    const s3Meta = await headObject(storageKey, bucketId);
    const resolvedFileSizeKb =
      s3Meta?.contentLength && s3Meta.contentLength > 0
        ? Math.max(1, Math.round(s3Meta.contentLength / 1024))
        : fileSizeKb || 0;
    const resolvedMimeType = mimeType || s3Meta?.contentType || "application/octet-stream";

    // 3. Check existing asset for deduplication / replacement
    const [existing] = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.appId, appId), eq(mediaAssets.assetId, assetId)))
      .limit(1);

    if (existing) {
      // Idempotency check: If user repeated the exact same confirmation call without changing anything
      const isIdentical =
        existing.storageKey === storageKey &&
        existing.publicUrl === publicUrl &&
        existing.isDeleted === false &&
        (uploaderName === undefined || existing.uploaderName === uploaderName) &&
        (title === undefined || existing.title === title) &&
        (info === undefined || existing.info === info);

      if (isIdentical) {
        return NextResponse.json({
          success: true,
          message: "Direct upload confirmation received. Asset is already registered and up-to-date in database.",
          data: existing,
          is_repeated_call: true,
        });
      }

      // If the asset key or bucket changed, physically remove the older file to prevent orphaned cloud storage files!
      if (existing.storageKey && existing.storageKey !== storageKey) {
        await deleteObject(existing.storageKey, existing.bucketId || undefined).catch((err) =>
          console.warn("[Storage] Failed to delete previous file during direct upsert:", err)
        );
      }
    }

    let savedAsset;
    let isReplaced = false;

    if (existing) {
      const updated = await db
        .update(mediaAssets)
        .set({
          bucketId: bucketId || existing.bucketId,
          title: title || existing.title,
          folder: folder || existing.folder,
          uploaderName: uploaderName !== undefined ? uploaderName : existing.uploaderName,
          info: info !== undefined ? info : existing.info,
          storageKey,
          publicUrl,
          originalSizeKb: resolvedFileSizeKb || existing.originalSizeKb,
          optimizedSizeKb: resolvedFileSizeKb || existing.optimizedSizeKb,
          width: width || existing.width,
          height: height || existing.height,
          mimeType: resolvedMimeType || existing.mimeType,
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(mediaAssets.id, existing.id))
        .returning();

      savedAsset = updated[0];
      isReplaced = true;
    } else {
      const inserted = await db
        .insert(mediaAssets)
        .values({
          appId,
          assetId,
          bucketId: bucketId || null,
          title: title || `Asset for ${assetId}`,
          folder: folder || "general",
          uploaderName: uploaderName || null,
          info: info || null,
          storageKey,
          publicUrl,
          originalSizeKb: resolvedFileSizeKb,
          optimizedSizeKb: resolvedFileSizeKb,
          width,
          height,
          mimeType: resolvedMimeType,
          isDeleted: false,
        })
        .returning();

      savedAsset = inserted[0];
    }

    // 4. Send asynchronous Telegram notification
    try {
      await sendTelegramNotification({
        event: isReplaced ? "ASSET_REPLACED" : "ASSET_UPLOADED",
        appName,
        assetId,
        title: title || `Asset for ${assetId}`,
        uploaderName: uploaderName || savedAsset.uploaderName || null,
        info: info || savedAsset.info || null,
        folder: folder || savedAsset.folder || "general",
        publicUrl,
        sizeKb: resolvedFileSizeKb,
        mimeType: resolvedMimeType,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: isReplaced
        ? "Direct media asset upload completed and existing asset replaced."
        : "Direct media asset upload registered and confirmed in database.",
      data: {
        id: savedAsset.id,
        app_id: savedAsset.appId,
        asset_id: savedAsset.assetId,
        title: savedAsset.title,
        folder: savedAsset.folder,
        uploader_name: savedAsset.uploaderName,
        info: savedAsset.info,
        public_url: savedAsset.publicUrl,
        mime_type: savedAsset.mimeType,
        file_size_kb: savedAsset.optimizedSizeKb,
        is_replaced: isReplaced,
        created_at: savedAsset.createdAt,
        updated_at: savedAsset.updatedAt,
      },
    });
  } catch (err: unknown) {
    console.error("API /v1/upload/complete error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
