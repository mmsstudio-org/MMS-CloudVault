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
  X,
  Info,
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
  serverNow?: number;
}

export function TrashManagerView({ initialTrash, serverNow = 0 }: TrashManagerViewProps) {
  const [trash, setTrash] = React.useState<MediaAsset[]>(initialTrash);
  const [isPurging, setIsPurging] = React.useState(false);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Modal Dialog States
  const [assetToRestore, setAssetToRestore] = React.useState<MediaAsset | null>(null);
  const [assetToDeletePermanently, setAssetToDeletePermanently] = React.useState<MediaAsset | null>(null);
  const [showPurgeAllModal, setShowPurgeAllModal] = React.useState(false);

  const confirmRestore = async () => {
    if (!assetToRestore) return;
    const { id, assetId } = assetToRestore;
    try {
      setRestoringId(id);
      await actionRestoreAsset(id);
      setTrash((prev) => prev.filter((item) => item.id !== id));
      toast.success(`Asset '${assetId}' restored to active gallery.`);
      setAssetToRestore(null);
    } catch {
      toast.error("Failed to restore asset.");
    } finally {
      setRestoringId(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!assetToDeletePermanently) return;
    const { id, assetId } = assetToDeletePermanently;
    try {
      setDeletingId(id);
      await actionDeleteAssetPermanently(id);
      setTrash((prev) => prev.filter((item) => item.id !== id));
      toast.success(`Asset '${assetId}' permanently erased from storage.`);
      setAssetToDeletePermanently(null);
    } catch {
      toast.error("Failed to delete asset permanently.");
    } finally {
      setDeletingId(null);
    }
  };

  const confirmPurgeAll = async () => {
    try {
      setIsPurging(true);
      const res = await actionPurgeTrashNow();
      setTrash([]);
      toast.success(`Trash purged! Permanently deleted ${res.purgedCount} assets.`);
      setShowPurgeAllModal(false);
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
          <div className="flex flex-wrap-reverse items-center gap-2 mb-1">
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              Trash & Lifecycle Management
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              30-Day Auto Retention
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xl">
            Deleted assets remain here for 30 days before permanent garbage collection. You can restore them anytime or trigger an immediate purge.
          </p>
        </div>

        {trash.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPurgeAllModal(true)}
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
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              No soft-deleted assets currently pending permanent deletion.
            </p>
          </div>
        ) : (
          trash.map((item) => {
            const isRestoring = restoringId === item.id;
            const deletedTime = item.deletedAt
              ? new Date(item.deletedAt).getTime()
              : serverNow;
            const daysInTrash = serverNow
              ? Math.floor((serverNow - deletedTime) / (1000 * 60 * 60 * 24))
              : 0;
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
                      <span className="text-[10px] text-amber-500 flex items-center gap-1 shrink-0 font-medium">
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
                    onClick={() => setAssetToRestore(item)}
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
                    onClick={() => setAssetToDeletePermanently(item)}
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

      {/* =========================================================================
          1. CONFIRM RESTORE ASSET ALERT DIALOG (Prevents Accidental Restorations)
          ========================================================================= */}
      {assetToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => !restoringId && setAssetToRestore(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Restore Media Asset
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Recover asset from trash back to active gallery
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAssetToRestore(null)}
                disabled={Boolean(restoringId)}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Preview Card */}
            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 relative border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                {assetToRestore.mimeType?.startsWith("audio/") ||
                /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(assetToRestore.storageKey) ? (
                  <div className="w-full h-full bg-emerald-950/40 text-emerald-400 flex items-center justify-center">
                    <Music className="w-6 h-6" />
                  </div>
                ) : (
                  <Image
                    src={assetToRestore.publicUrl}
                    alt={assetToRestore.title || assetToRestore.assetId}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                    {assetToRestore.appId}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {assetToRestore.folder}
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={assetToRestore.title || assetToRestore.assetId}>
                  {assetToRestore.title || assetToRestore.assetId}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                  ID: {assetToRestore.assetId} • {assetToRestore.optimizedSizeKb} KB
                </p>
              </div>
            </div>

            {/* Explanation Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                Restoration Impact
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                This asset will be immediately removed from Trash and made active in the Media Gallery. Public CDN links and application API requests will resume serving this asset normally.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setAssetToRestore(null)}
                disabled={Boolean(restoringId)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmRestore}
                disabled={Boolean(restoringId)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {restoringId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>Confirm Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. CONFIRM PERMANENT DELETE ALERT DIALOG
          ========================================================================= */}
      {assetToDeletePermanently && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => !deletingId && setAssetToDeletePermanently(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Delete Permanently
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Irreversible destruction of asset and physical files
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAssetToDeletePermanently(null)}
                disabled={Boolean(deletingId)}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Preview Card */}
            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 relative border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                {assetToDeletePermanently.mimeType?.startsWith("audio/") ||
                /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(assetToDeletePermanently.storageKey) ? (
                  <div className="w-full h-full bg-red-950/40 text-red-400 flex items-center justify-center">
                    <Music className="w-6 h-6" />
                  </div>
                ) : (
                  <Image
                    src={assetToDeletePermanently.publicUrl}
                    alt={assetToDeletePermanently.title || assetToDeletePermanently.assetId}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                    {assetToDeletePermanently.appId}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {assetToDeletePermanently.folder}
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={assetToDeletePermanently.title || assetToDeletePermanently.assetId}>
                  {assetToDeletePermanently.title || assetToDeletePermanently.assetId}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                  ID: {assetToDeletePermanently.assetId} • {assetToDeletePermanently.optimizedSizeKb} KB
                </p>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="p-3.5 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-500/20 text-xs text-red-800 dark:text-red-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                Permanent Destruction Warning
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The physical file will be immediately erased from cloud object storage (S3/R2) and database records. This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setAssetToDeletePermanently(null)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmPermanentDelete}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {deletingId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Erase Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. CONFIRM PURGE ALL TRASH ALERT DIALOG
          ========================================================================= */}
      {showPurgeAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => !isPurging && setShowPurgeAllModal(false)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Purge Entire Trash
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Bulk permanent deletion of all {trash.length} items
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPurgeAllModal(false)}
                disabled={isPurging}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-500/20 text-xs space-y-2">
              <p className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                Irreversible Bulk Action
              </p>
              <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                Are you sure you want to permanently erase all <strong className="text-zinc-900 dark:text-white">{trash.length} assets</strong> in the trash bin? All corresponding physical objects across all cloud storage buckets and database records will be destroyed immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPurgeAllModal(false)}
                disabled={isPurging}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmPurgeAll}
                disabled={isPurging}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isPurging ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Purge All Trash Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
