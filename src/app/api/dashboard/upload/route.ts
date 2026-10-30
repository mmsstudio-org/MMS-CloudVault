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

    if (!file || !appId || !assetId) {
      return NextResponse.json(
        { success: false, error: "Missing required file, appId or assetId." },
        { status: 400 }
      );
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
    });

    return NextResponse.json({
      success: true,
      asset: result.asset,
      isReplaced: result.isReplaced,
      savedKb: result.savedKb,
    });
  } catch (err: unknown) {
    console.error("Dashboard upload error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
