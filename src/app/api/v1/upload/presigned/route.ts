import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-cache";
import { validateAppCheckToken } from "@/lib/app-check-validator";
import { getDefaultActiveBucket, getBucketById, createPresignedUploadUrl } from "@/lib/storage";

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

    const {
      appId,
      appName,
      enforceAppCheck,
      firebaseProjectId,
      allowedAppIds,
      allowedDebugTokens,
      defaultBucketId,
      audioBucketId,
      imageBucketId,
    } = auth.app;

    // 1.1 Verify Mobile App Check if enforced
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

    // 2. Parse JSON body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Bad Request: JSON body required." },
        { status: 400 }
      );
    }

    const assetId = typeof body.asset_id === "string" ? body.asset_id.trim() : "";
    const fileName = typeof body.file_name === "string" ? body.file_name.trim() : "file";
    const mimeType = typeof body.mime_type === "string" ? body.mime_type.trim().toLowerCase() : "application/octet-stream";
    const folder = typeof body.folder === "string" ? body.folder.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "general" : "general";
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const uploaderName = typeof body.uploader_name === "string" ? body.uploader_name.trim() : undefined;
    const info = typeof body.info === "string" ? body.info.trim() : undefined;

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: "Bad Request: 'asset_id' is required." },
        { status: 400 }
      );
    }

    const isAudio =
      mimeType.startsWith("audio/") ||
      /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName);

    // 3. Resolve Target Storage Bucket (app routing rules)
    let targetBucket = null;
    if (isAudio && audioBucketId) {
      targetBucket = await getBucketById(audioBucketId);
    } else if (!isAudio && imageBucketId) {
      targetBucket = await getBucketById(imageBucketId);
    } else if (defaultBucketId) {
      targetBucket = await getBucketById(defaultBucketId);
    }

    if (!targetBucket) {
      targetBucket = await getDefaultActiveBucket();
    }

    // 4. Construct consistent Storage Key
    const ext = fileName.includes(".")
      ? fileName.split(".").pop()?.toLowerCase() || (isAudio ? "mp3" : "webp")
      : (isAudio ? "mp3" : "webp");
    const sanitizedAssetId = assetId.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const storageKey = `${appId}/${folder}/${sanitizedAssetId}.${ext}`;

    // 5. Generate Pre-signed URL (Valid for 5 minutes / 300s)
    const { uploadUrl, publicUrl } = await createPresignedUploadUrl(
      targetBucket,
      storageKey,
      mimeType,
      300
    );

    return NextResponse.json({
      success: true,
      message: "Direct upload pre-signed URL successfully generated. Issue an HTTP PUT directly to upload_url with file body.",
      data: {
        upload_url: uploadUrl,
        public_url: publicUrl,
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        expires_in_seconds: 300,
        metadata: {
          app_id: appId,
          app_name: appName,
          asset_id: assetId,
          title,
          folder,
          storage_key: storageKey,
          bucket_id: targetBucket.id,
          bucket_name: targetBucket.name,
          uploader_name: uploaderName,
          info,
          mime_type: mimeType,
        },
      },
    });
  } catch (err: unknown) {
    console.error("API /v1/upload/presigned error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
