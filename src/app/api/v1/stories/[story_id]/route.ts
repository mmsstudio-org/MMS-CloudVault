import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-cache";
import { db } from "@/db";
import { storyAssets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { softDeleteAsset } from "@/lib/trash-manager";

interface RouteParams {
  params: Promise<{ story_id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { story_id: storyId } = await params;

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
      .from(storyAssets)
      .where(
        and(
          eq(storyAssets.appId, appId),
          eq(storyAssets.storyId, storyId),
          eq(storyAssets.isDeleted, false)
        )
      )
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Story asset not found for story_id '${storyId}' under app '${appId}'.`,
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
        story_id: asset.storyId,
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
    console.error("API /v1/stories/[story_id] GET error:", err);
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
    const { story_id: storyId } = await params;

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
      .from(storyAssets)
      .where(
        and(
          eq(storyAssets.appId, appId),
          eq(storyAssets.storyId, storyId),
          eq(storyAssets.isDeleted, false)
        )
      )
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Active story asset not found for story_id '${storyId}'.`,
        },
        { status: 404 }
      );
    }

    await softDeleteAsset(records[0].id);

    return NextResponse.json({
      success: true,
      message: `Story asset '${storyId}' successfully moved to trash.`,
      story_id: storyId,
    });
  } catch (err: unknown) {
    console.error("API /v1/stories/[story_id] DELETE error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
