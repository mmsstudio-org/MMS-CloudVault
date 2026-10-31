import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-cache";
import { processAndSaveAsset } from "@/lib/asset-manager";
import { validateAppCheckToken } from "@/lib/app-check-validator";

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

    const {
      appId,
      appName,
      enforceAppCheck,
      firebaseProjectId,
      allowedAppIds,
      allowedDebugTokens,
    } = auth.app;

    // 1.1 Verify Google Play Integrity / Firebase App Check (if enforced for this API key)
    if (enforceAppCheck) {
      const appCheckHeader =
        req.headers.get("x-firebase-appcheck") ||
        req.headers.get("x-app-check-token") ||
        req.headers.get("X-Firebase-AppCheck") ||
        req.headers.get("X-App-Check-Token");

      const checkResult = await validateAppCheckToken(appCheckHeader, {
        enforceAppCheck: true,
        firebaseProjectId,
        allowedAppIds,
        allowedDebugTokens,
      });

      if (!checkResult.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: `Forbidden: Mobile App Check validation failed (${checkResult.error})`,
          },
          { status: 403 }
        );
      }
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetId = (formData.get("asset_id") as string | null)?.trim();
    const title = (formData.get("title") as string | null)?.trim() || undefined;
    const folder = (formData.get("folder") as string | null)?.trim() || "general";

    // Optional Audio Compression Parameters
    const compressAudioParam =
      (formData.get("compress_audio") as string | null)?.toLowerCase() ===
        "true" ||
      (formData.get("compress_audio") as string | null) === "1" ||
      req.nextUrl.searchParams.get("compress_audio") === "true";

    const audioBitrateParam =
      ((formData.get("audio_bitrate") as string | null) ||
        req.nextUrl.searchParams.get("audio_bitrate"))?.toLowerCase() as
        | "96k"
        | "128k"
        | "192k"
        | "256k"
        | "320k"
        | undefined;

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
          error: "Bad Request: 'file' binary media field is required in form-data.",
        },
        { status: 400 }
      );
    }

    // 3. Validate image or audio MIME type
    const isImage =
      file.type.startsWith("image/") ||
      !!file.name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i);
    const isAudio =
      file.type.startsWith("audio/") ||
      !!file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);

    if (!isImage && !isAudio) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported Media Type: Uploaded file must be a valid image (JPEG, PNG, WebP, GIF, SVG) or audio file (MP3, WAV, OGG, M4A, AAC, FLAC).",
        },
        { status: 415 }
      );
    }

    // 4. Convert to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Process, Optimize, Deduplicate, Route to Bucket & Upload
    const result = await processAndSaveAsset({
      appId,
      appName,
      assetId,
      title,
      folder,
      buffer,
      fileName: file.name,
      mimeType: file.type,
      apiKey: auth.app,
      audioOptions:
        isAudio && compressAudioParam
          ? {
              compress: true,
              bitrate: audioBitrateParam || "192k",
            }
          : undefined,
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
          storage_bucket: result.bucket.name,
          storage_provider: result.bucket.provider,
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
