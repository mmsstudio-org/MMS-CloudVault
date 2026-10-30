import { getGalleryAssets } from "@/lib/dashboard-actions";
import { GalleryView } from "@/components/gallery-view";

export const metadata = {
  title: "Asset Gallery",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const assets = await getGalleryAssets();

  const apps = Array.from(new Set(assets.map((a) => a.appId)));
  const folders = Array.from(new Set(assets.map((a) => a.folder)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Media Asset Gallery
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Explore, filter, copy public CDN links, and manage your optimized story images.
        </p>
      </div>

      <GalleryView initialAssets={assets} apps={apps} folders={folders} />
    </div>
  );
}
