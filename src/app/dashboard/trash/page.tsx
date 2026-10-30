import { getTrashAssets } from "@/lib/dashboard-actions";
import { TrashManagerView } from "@/components/trash-manager-view";

export const metadata = {
  title: "Trash Bin & System Cleanup",
};

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const trash = await getTrashAssets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Trash Bin & System Cleanup
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Review soft-deleted media assets, restore accidental deletions, or trigger immediate garbage collection.
        </p>
      </div>

      <TrashManagerView initialTrash={trash} />
    </div>
  );
}
