import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processAndSaveAsset } from "@/lib/asset-manager";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator session required." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const appId = (formData.get("app_id") as string | null)?.trim();
    const assetId = (formData.get("asset_id") as string | null)?.trim();
    const title = (formData.get("title") as string | null)?.trim() || undefined;
    const folder = (formData.get("folder") as string | null)?.trim() || "general";
    const customUploader = (formData.get("uploader_name") as string | null)?.trim();
    const uploaderName = customUploader || session.user.name || session.user.email || "Admin";
    const info = (formData.get("info") as string | null)?.trim() || undefined;
    const targetBucketId =
      (formData.get("target_bucket_id") as string | null)?.trim() || undefined;

    const compressAudioParam =
      (formData.get("compress_audio") as string | null) === "true";
    const audioBitrateParam =
      (formData.get("audio_bitrate") as string | null) as
        | "96k"
        | "128k"
        | "192k"
        | "256k"
        | "320k"
        | undefined;

    if (!file || !appId || !assetId) {
      return NextResponse.json(
        { success: false, error: "Missing required file, appId or assetId." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const isAudio =
      file.type.startsWith("audio/") ||
      !!file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);

    const result = await processAndSaveAsset({
      appId,
      assetId,
      title,
      folder,
      uploaderName,
      info,
      buffer,
      appName: appId === "general" ? "Studio Global" : appId,
      fileName: file.name,
      mimeType: file.type,
      targetBucketId,
      audioOptions:
        isAudio && compressAudioParam
          ? {
              compress: true,
              bitrate: audioBitrateParam || "192k",
            }
          : undefined,
    });

    return NextResponse.json({
      success: true,
      asset: result.asset,
      isReplaced: result.isReplaced,
      savedKb: result.savedKb,
      bucket: result.bucket.name,
    });
  } catch (err: unknown) {
    console.error("Dashboard upload error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
