"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Trash2,
  Archive,
  X,
  Loader2,
  Music,
  ShieldAlert,
} from "lucide-react";
import { MediaAsset } from "@/db/schema";

interface DeleteAssetDialogProps {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSoftDelete: (id: string, assetId: string) => Promise<void>;
  onPermanentDelete: (id: string, assetId: string) => Promise<void>;
}

export function DeleteAssetDialog({
  asset,
  isOpen,
  onClose,
  onSoftDelete,
  onPermanentDelete,
}: DeleteAssetDialogProps) {
  const [isSoftDeleting, setIsSoftDeleting] = React.useState(false);
  const [isPermanentDeleting, setIsPermanentDeleting] = React.useState(false);

  if (!isOpen || !asset) return null;

  const isAudio =
    asset.mimeType?.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(asset.storageKey);

  const handleSoft = async () => {
    try {
      setIsSoftDeleting(true);
      await onSoftDelete(asset.id, asset.assetId);
      onClose();
    } finally {
      setIsSoftDeleting(false);
    }
  };

  const handlePermanent = async () => {
    try {
      setIsPermanentDeleting(true);
      await onPermanentDelete(asset.id, asset.assetId);
      onClose();
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  const isAnyLoading = isSoftDeleting || isPermanentDeleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => !isAnyLoading && onClose()}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Delete Media Asset
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose how you want to remove this media asset
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isAnyLoading}
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Asset Preview Card */}
        <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 relative border border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
            {isAudio ? (
              <div className="w-full h-full bg-gradient-to-br from-emerald-950 to-zinc-900 flex items-center justify-center text-emerald-400">
                <Music className="w-6 h-6" />
              </div>
            ) : (
              <Image
                src={asset.publicUrl}
                alt={asset.title || asset.assetId}
                fill
                className="object-cover"
                unoptimized
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                {asset.appId}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono truncate">
                /{asset.folder}
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={asset.title || asset.assetId}>
              {asset.title || asset.assetId}
            </p>
            <p className="text-[11px] text-zinc-400 font-mono truncate">
              ID: {asset.assetId} • {asset.optimizedSizeKb} KB
            </p>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100/60 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
          <p>
            <strong className="text-zinc-900 dark:text-zinc-200">📦 Move to Trash (Soft Delete):</strong> Hides the item from the gallery and holds it in the Trash Bin for 30 days. You can restore it anytime before automated garbage collection.
          </p>
          <p>
            <strong className="text-red-600 dark:text-red-400">🔥 Permanent Delete:</strong> Immediately and irreversibly erases the physical file from Cloud Object Storage (S3 / R2) and deletes the database record. The public CDN URL will instantly return 404.
          </p>
        </div>

        {/* Action Button Layout: Left = Cancel | Middle = Permanent Delete | Right (Default) = Move to Trash */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          {/* Left: Cancel */}
          <button
            type="button"
            onClick={onClose}
            disabled={isAnyLoading}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            {/* Middle: Permanent Delete */}
            <button
              type="button"
              onClick={handlePermanent}
              disabled={isAnyLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition disabled:opacity-50 cursor-pointer"
            >
              {isPermanentDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Permanent Delete</span>
            </button>

            {/* Right (Default): Move to Trash (Soft Delete) */}
            <button
              type="button"
              onClick={handleSoft}
              disabled={isAnyLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSoftDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Move to Trash (Soft)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
