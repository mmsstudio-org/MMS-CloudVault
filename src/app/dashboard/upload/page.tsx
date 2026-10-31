import { getApiKeysList, getGalleryAssets } from "@/lib/dashboard-actions";
import { UploadForm } from "@/components/upload-form";

export const metadata = {
  title: "Manual Web Upload",
};

export const dynamic = "force-dynamic";

export default async function ManualUploadPage() {
  const allKeys = await getApiKeysList();
  const assets = await getGalleryAssets();

  // Always offer General / Studio Global as the primary default choice
  const apps = [
    { appName: "🌐 General / Studio Global", appId: "general" },
    ...allKeys
      .filter((k) => k.isActive && k.appId !== "general")
      .map((k) => ({ appName: k.appName, appId: k.appId })),
  ];

  const existingFolders = Array.from(new Set(assets.map((a) => a.folder)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Manual Web Uploader
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Upload and optimize media assets directly through the browser with identical Sharp compression and asset deduplication rules.
        </p>
      </div>

      <UploadForm apps={apps} existingFolders={existingFolders} />
    </div>
  );
}
