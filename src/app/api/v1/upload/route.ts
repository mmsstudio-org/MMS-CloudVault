import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-cache";
import { processAndSaveAsset } from "@/lib/asset-manager";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via Header
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

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetId = (formData.get("asset_id") as string | null)?.trim();
    const title = (formData.get("title") as string | null)?.trim() || undefined;
    const folder = (formData.get("folder") as string | null)?.trim() || "general";

    if (!assetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: 'asset_id' field is required in form-data.",
        },
        { status: 400 }
      );
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: 'file' binary image field is required in form-data.",
        },
        { status: 400 }
      );
    }

    // 3. Validate image MIME type
    if (!file.type.startsWith("image/") && !file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported Media Type: Uploaded file must be a valid image format.",
        },
        { status: 415 }
      );
    }

    // 4. Convert to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Process, Optimize, Deduplicate & Upload
    const result = await processAndSaveAsset({
      appId,
      appName,
      assetId,
      title,
      folder,
      buffer,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.isReplaced
          ? "Media asset successfully replaced existing item for this asset ID"
          : "Media asset successfully optimized and saved",
        data: {
          id: result.asset.id,
          app_id: result.asset.appId,
          asset_id: result.asset.assetId,
          title: result.asset.title,
          folder: result.asset.folder,
          public_url: result.asset.publicUrl,
          blur_hash: result.asset.blurHash,
          is_replaced: result.isReplaced,
          original_size_kb: result.asset.originalSizeKb,
          optimized_size_kb: result.asset.optimizedSizeKb,
          saved_size_kb: result.savedKb,
          width: result.asset.width,
          height: result.asset.height,
          mime_type: result.asset.mimeType,
          created_at: result.asset.createdAt,
          updated_at: result.asset.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("API /v1/upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
