"use client";

import * as React from "react";
import Image from "next/image";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Music,
} from "lucide-react";
import { MediaAsset } from "@/db/schema";
import {
  actionRestoreAsset,
  actionPurgeTrashNow,
  actionDeleteAssetPermanently,
} from "@/lib/dashboard-actions";
import { toast } from "sonner";

interface TrashManagerViewProps {
  initialTrash: MediaAsset[];
}

export function TrashManagerView({ initialTrash }: TrashManagerViewProps) {
  const [trash, setTrash] = React.useState<MediaAsset[]>(initialTrash);
  const [isPurging, setIsPurging] = React.useState(false);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Memoize timestamp to ensure pure render (React 19 / Compiler compliant)
  const currentTimestamp = React.useMemo(() => Date.now(), []);

  const handleRestore = async (id: string, assetId: string) => {
    try {
      setRestoringId(id);
      await actionRestoreAsset(id);
      setTrash((prev) => prev.filter((item) => item.id !== id));
      toast.success(`Asset '${assetId}' restored to active gallery.`);
    } catch {
      toast.error("Failed to restore asset.");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (id: string, assetId: string) => {
    if (
      !confirm(
        `CRITICAL: Permanently destroy asset '${assetId}'? The physical file will be immediately erased from Object Storage and database.`
      )
    ) {
      return;
    }
    try {
      setDeletingId(id);
      await actionDeleteAssetPermanently(id);
      setTrash((prev) => prev.filter((item) => item.id !== id));
      toast.success(`Asset '${assetId}' permanently erased from storage.`);
    } catch {
      toast.error("Failed to delete asset permanently.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePurgeAll = async () => {
    if (
      !confirm(
        "CRITICAL: Are you sure you want to permanently purge all trash? All physical files in Object Storage and database records will be irreversibly destroyed."
      )
    ) {
      return;
    }

    try {
      setIsPurging(true);
      const res = await actionPurgeTrashNow();
      setTrash([]);
      toast.success(`Trash purged! Permanently deleted ${res.purgedCount} assets.`);
    } catch {
      toast.error("Failed to purge trash.");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Purge Controls & Policy Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              Trash & Lifecycle Management
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              30-Day Auto Retention
            </span>
          </div>
          <p className="text-xs text-zinc-500 max-w-xl">
            Deleted assets remain here for 30 days before permanent garbage collection. You can restore them anytime or trigger an immediate purge.
          </p>
        </div>

        {trash.length > 0 && (
          <button
            type="button"
            onClick={handlePurgeAll}
            disabled={isPurging}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
          >
            {isPurging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Purge All Trash Now ({trash.length})</span>
          </button>
        )}
      </div>

      {/* Trash List */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
        {trash.length === 0 ? (
          <div className="p-16 text-center text-zinc-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Trash bin is empty.
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              No soft-deleted assets currently pending permanent deletion.
            </p>
          </div>
        ) : (
          trash.map((item) => {
            const isRestoring = restoringId === item.id;
            const deletedTime = item.deletedAt
              ? new Date(item.deletedAt).getTime()
              : currentTimestamp;
            const daysInTrash = Math.floor(
              (currentTimestamp - deletedTime) / (1000 * 60 * 60 * 24)
            );
            const daysRemaining = Math.max(0, 30 - daysInTrash);

            const isAudio =
              item.mimeType?.startsWith("audio/") ||
              /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(item.storageKey);

            return (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/50 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 relative border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    {isAudio ? (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Music className="w-6 h-6" />
                      </div>
                    ) : (
                      <Image
                        src={item.publicUrl}
                        alt={item.title || item.assetId}
                        fill
                        className="object-cover grayscale"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                        {item.appId}
                      </span>
                      <span className="text-[10px] text-amber-500 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {daysRemaining} days left
                      </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={item.title || item.assetId}>
                      {item.title || item.assetId}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono truncate" title={`ID: ${item.assetId}`}>
                      ID: {item.assetId} • {item.optimizedSizeKb} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(item.id, item.assetId)}
                    disabled={isRestoring || deletingId === item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(item.id, item.assetId)}
                    disabled={isRestoring || deletingId === item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/40 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition cursor-pointer disabled:opacity-50"
                    title="Permanently erase from Object Storage"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete Permanently</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Automated Cron Configuration Documentation */}
      <div className="p-5 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-950 border border-zinc-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Scheduled Cron Job Endpoint
        </h3>
        <p className="text-xs text-zinc-300">
          Automate 30-day trash cleanup on your server or Vercel Cron by calling:
        </p>
        <pre className="p-3 rounded-xl bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 font-mono text-xs text-amber-400 overflow-x-auto">
{`POST /api/v1/cron/cleanup-trash HTTP/1.1
Authorization: Bearer <CRON_SECRET>`}
        </pre>
      </div>
    </div>
  );
}
