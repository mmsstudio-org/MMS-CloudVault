import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-cache";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { softDeleteAsset, deleteAssetPermanently } from "@/lib/trash-manager";

interface RouteParams {
  params: Promise<{ asset_id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { asset_id: assetId } = await params;

    // Authenticate API Key
    const apiKeyHeader =
      req.headers.get("x-api-key") ||
      req.headers.get("X-API-KEY") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const auth = await validateApiKey(apiKeyHeader);
    if (!auth.isValid || !auth.app) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or inactive API Key in x-api-key header.",
        },
        { status: 401 }
      );
    }

    const { appId } = auth.app;

    // Fetch active asset
    const records = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.appId, appId),
          eq(mediaAssets.assetId, assetId),
          eq(mediaAssets.isDeleted, false)
        )
      )
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Media asset not found for asset_id '${assetId}' under app '${appId}'.`,
        },
        { status: 404 }
      );
    }

    const asset = records[0];

    return NextResponse.json({
      success: true,
      data: {
        id: asset.id,
        app_id: asset.appId,
        asset_id: asset.assetId,
        title: asset.title,
        folder: asset.folder,
        public_url: asset.publicUrl,
        blur_hash: asset.blurHash,
        width: asset.width,
        height: asset.height,
        file_size_kb: asset.optimizedSizeKb,
        mime_type: asset.mimeType,
        created_at: asset.createdAt,
        updated_at: asset.updatedAt,
      },
    });
  } catch (err: unknown) {
    console.error("API /v1/assets/[asset_id] GET error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { asset_id: assetId } = await params;

    const apiKeyHeader =
      req.headers.get("x-api-key") ||
      req.headers.get("X-API-KEY") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const auth = await validateApiKey(apiKeyHeader);
    if (!auth.isValid || !auth.app) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or inactive API Key in x-api-key header.",
        },
        { status: 401 }
      );
    }

    const { appId } = auth.app;

    const records = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.appId, appId),
          eq(mediaAssets.assetId, assetId),
          eq(mediaAssets.isDeleted, false)
        )
      )
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Active media asset not found for asset_id '${assetId}'.`,
        },
        { status: 404 }
      );
    }

    const isSoft = req.nextUrl.searchParams.get("soft") === "true";

    if (isSoft) {
      await softDeleteAsset(records[0].id);
      return NextResponse.json({
        success: true,
        message: `Media asset '${assetId}' moved to trash.`,
        asset_id: assetId,
      });
    }

    await deleteAssetPermanently(records[0].id);

    return NextResponse.json({
      success: true,
      message: `Media asset '${assetId}' permanently deleted from object storage and database.`,
      asset_id: assetId,
    });
  } catch (err: unknown) {
    console.error("API /v1/assets/[asset_id] DELETE error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
