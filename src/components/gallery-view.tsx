"use client";

import * as React from "react";
import Image from "next/image";
import {
  Search,
  Grid,
  List,
  ExternalLink,
  Trash2,
  QrCode,
  SlidersHorizontal,
  X,
  Loader2,
  Music,
  Volume2,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MediaAsset } from "@/db/schema";
import { CopyButton } from "./copy-button";
import {
  actionSoftDeleteAsset,
  actionDeleteAssetPermanently,
  actionUpdateAssetMetadata,
} from "@/lib/dashboard-actions";
import { DeleteAssetDialog } from "./delete-asset-dialog";
import { toast } from "sonner";
import QRCode from "qrcode";

interface GalleryViewProps {
  initialAssets: MediaAsset[];
  apps: string[];
  folders: string[];
}

export function GalleryView({ initialAssets, apps, folders }: GalleryViewProps) {
  const [assets, setAssets] = React.useState<MediaAsset[]>(initialAssets);
  const [search, setSearch] = React.useState("");
  const [selectedApp, setSelectedApp] = React.useState("ALL");
  const [selectedFolder, setSelectedFolder] = React.useState("ALL");
  const [mediaTypeFilter, setMediaTypeFilter] = React.useState<"ALL" | "IMAGE" | "AUDIO">("ALL");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [qrModalAsset, setQrModalAsset] = React.useState<MediaAsset | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState("");
  const [assetToDelete, setAssetToDelete] = React.useState<MediaAsset | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number>(24);

  // Edit Metadata Modal State
  const [editingAsset, setEditingAsset] = React.useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editFolder, setEditFolder] = React.useState("");
  const [isCustomEditFolder, setIsCustomEditFolder] = React.useState(false);
  const [customEditFolder, setCustomEditFolder] = React.useState("");
  const [isSavingMetadata, setIsSavingMetadata] = React.useState(false);

  // Filter logic
  const filteredAssets = React.useMemo(() => {
    return assets.filter((asset) => {
      const matchApp = selectedApp === "ALL" || asset.appId === selectedApp;
      const matchFolder =
        selectedFolder === "ALL" || asset.folder === selectedFolder;
      const isAudio =
        asset.mimeType.startsWith("audio/") ||
        /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(asset.storageKey);
      const matchType =
        mediaTypeFilter === "ALL" ||
        (mediaTypeFilter === "AUDIO" && isAudio) ||
        (mediaTypeFilter === "IMAGE" && !isAudio);

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        asset.assetId.toLowerCase().includes(q) ||
        (asset.title && asset.title.toLowerCase().includes(q));

      return matchApp && matchFolder && matchType && matchSearch;
    });
  }, [assets, selectedApp, selectedFolder, mediaTypeFilter, search]);

  // Reset pagination when any filter or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedApp, selectedFolder, mediaTypeFilter, pageSize]);

  // Pagination Calculations
  const totalFilteredCount = filteredAssets.length;
  const totalPages =
    pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const displayedAssets = React.useMemo(() => {
    if (pageSize === 0) return filteredAssets;
    const startIndex = (safePage - 1) * pageSize;
    return filteredAssets.slice(startIndex, startIndex + pageSize);
  }, [filteredAssets, safePage, pageSize]);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  };

  const handleOpenEdit = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setEditTitle(asset.title || "");
    setEditFolder(asset.folder || "general");
    setIsCustomEditFolder(false);
    setCustomEditFolder("");
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    const finalFolder = isCustomEditFolder
      ? customEditFolder.trim()
      : editFolder.trim();

    try {
      setIsSavingMetadata(true);
      const updated = await actionUpdateAssetMetadata(editingAsset.id, {
        title: editTitle.trim(),
        folder: finalFolder || "general",
      });
      setAssets((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      setEditingAsset(null);
      toast.success("Asset metadata updated successfully.");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update asset."
      );
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleConfirmSoftDelete = async (id: string, assetId: string) => {
    try {
      await actionSoftDeleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success(`Asset '${assetId}' moved to trash. Retained for 30 days.`);
    } catch {
      toast.error("Failed to move asset to trash.");
      throw new Error("Failed to soft delete");
    }
  };

  const handleConfirmPermanentDelete = async (id: string, assetId: string) => {
    try {
      await actionDeleteAssetPermanently(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success(`Asset '${assetId}' permanently erased from cloud storage and database.`);
    } catch {
      toast.error("Failed to delete asset permanently.");
      throw new Error("Failed to permanently delete");
    }
  };

  const handleOpenQr = async (asset: MediaAsset) => {
    try {
      setQrModalAsset(asset);
      const url = await QRCode.toDataURL(asset.publicUrl, { width: 300, margin: 2 });
      setQrCodeUrl(url);
    } catch {
      toast.error("Failed to generate QR code.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Filters & Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Asset ID or Title..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & View Toggles */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* App Selector */}
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Apps ({apps.length})</option>
            {apps.map((app) => (
              <option key={app} value={app}>
                {app === "general" ? "🌐 General (Studio Global)" : app}
              </option>
            ))}
          </select>

          {/* Folder Selector */}
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Folders ({folders.length})</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>

          {/* Media Type Filter */}
          <select
            value={mediaTypeFilter}
            onChange={(e) => setMediaTypeFilter(e.target.value as "ALL" | "IMAGE" | "AUDIO")}
            className="px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer font-medium"
          >
            <option value="ALL">All Media Types</option>
            <option value="IMAGE">Images Only</option>
            <option value="AUDIO">Audio (MP3 / WAV)</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Asset Grid / List Display */}
      {filteredAssets.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
          <SlidersHorizontal className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No media assets match your criteria.
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Try adjusting your search query or reset the app/folder filters.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayedAssets.map((asset) => {
            const isAudio =
              asset.mimeType?.startsWith("audio/") ||
              /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(asset.storageKey);

            return (
              <div
                key={asset.id}
                className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                {/* Media Preview Container */}
                {isAudio ? (
                  <div className="relative aspect-video w-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-3.5 flex flex-col justify-between overflow-hidden border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Music className="w-3 h-3 animate-pulse" /> Audio
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300">
                          {asset.appId === "general" ? "🌐 global" : asset.appId}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        /{asset.folder}
                      </span>
                    </div>

                    <div className="py-1">
                      <p className="text-xs font-bold text-white line-clamp-1">
                        {asset.title || asset.assetId}
                      </p>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {asset.mimeType}
                      </span>
                    </div>

                    {/* Integrated Audio Player */}
                    <div className="mt-auto">
                      <audio
                        controls
                        controlsList="nodownload"
                        src={asset.publicUrl}
                        className="w-full h-8 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
                    <Image
                      src={asset.publicUrl}
                      alt={asset.title || asset.assetId}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                      unoptimized
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md">
                        {asset.appId === "general" ? "🌐 global" : asset.appId}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900/70 text-zinc-300 backdrop-blur-md">
                        {asset.folder}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Meta Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between min-w-0 overflow-hidden">
                  <div className="min-w-0 overflow-hidden">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1" title={asset.title || asset.assetId}>
                      {asset.title || asset.assetId}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate" title={`ID: ${asset.assetId}`}>
                      ID: {asset.assetId}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">
                      {isAudio ? (
                        <>
                          <span className="text-emerald-500 font-medium">Audio Track</span>
                          <span>•</span>
                          <span>{asset.optimizedSizeKb} KB</span>
                        </>
                      ) : (
                        <>
                          <span>{asset.width}x{asset.height} px</span>
                          <span>•</span>
                          <span>{asset.optimizedSizeKb} KB (WebP)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <CopyButton text={asset.publicUrl} />
                      <button
                        type="button"
                        onClick={() => handleOpenQr(asset)}
                        title="Show QR Code"
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <a
                        href={asset.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in New Tab"
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(asset)}
                        title="Edit Metadata (Title & Folder)"
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-cyan-500 hover:border-cyan-500/40 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAssetToDelete(asset)}
                      title="Delete Asset"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {displayedAssets.map((asset) => {
              const isAudio =
                asset.mimeType?.startsWith("audio/") ||
                /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(asset.storageKey);

              return (
                <div
                  key={asset.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/50 transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 overflow-hidden">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 relative border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                      {isAudio ? (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-950 to-zinc-900 flex items-center justify-center text-emerald-400">
                          <Music className="w-6 h-6 animate-pulse" />
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
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                          {asset.appId === "general" ? "🌐 global" : asset.appId}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono truncate">
                          /{asset.folder}
                        </span>
                        {isAudio && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-semibold shrink-0">
                            AUDIO
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={asset.title || asset.assetId}>
                        {asset.title || asset.assetId}
                      </p>
                      {isAudio ? (
                        <div className="flex flex-wrap items-center gap-2 mt-1 min-w-0">
                          <span className="text-[11px] text-zinc-400 font-mono truncate max-w-full" title={`ID: ${asset.assetId}`}>
                            ID: {asset.assetId} • {asset.optimizedSizeKb} KB
                          </span>
                          <audio controls src={asset.publicUrl} className="h-6 w-44 sm:w-56" />
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-400 font-mono truncate" title={`ID: ${asset.assetId}`}>
                          ID: {asset.assetId} • {asset.width}x{asset.height} px • {asset.optimizedSizeKb} KB
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <CopyButton text={asset.publicUrl} />
                    <button
                      type="button"
                      onClick={() => handleOpenQr(asset)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <a
                      href={asset.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(asset)}
                      title="Edit Metadata (Title & Folder)"
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-cyan-500 hover:border-cyan-500/40 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssetToDelete(asset)}
                      title="Delete Asset"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modern High-Performance Pagination Controls Bar */}
      {filteredAssets.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-zinc-900 dark:text-white">
              {totalFilteredCount === 0
                ? 0
                : (safePage - 1) * (pageSize || totalFilteredCount) + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-zinc-900 dark:text-white">
              {pageSize === 0
                ? totalFilteredCount
                : Math.min(safePage * pageSize, totalFilteredCount)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-zinc-900 dark:text-white">
              {totalFilteredCount}
            </span>{" "}
            assets
          </div>

          {/* Page numbers navigation */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((num, idx) =>
                  num === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 py-1 text-zinc-400 select-none"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${num}`}
                      type="button"
                      onClick={() => {
                        setCurrentPage(num as number);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`min-w-8 h-8 px-2 rounded-lg font-medium transition cursor-pointer ${
                        safePage === num
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
                          : "border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page size dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
              <option value={0}>All</option>
            </select>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal Dialog */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Edit Asset Metadata
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    {editingAsset.assetId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Asset Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Descriptive title"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Target Folder
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomEditFolder(!isCustomEditFolder)}
                    className="text-[11px] text-cyan-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isCustomEditFolder ? "Choose Existing" : "+ New Folder"}
                  </button>
                </div>

                {isCustomEditFolder ? (
                  <input
                    type="text"
                    value={customEditFolder}
                    onChange={(e) => setCustomEditFolder(e.target.value)}
                    placeholder="e.g. banners, products, avatars"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    autoFocus
                  />
                ) : (
                  <select
                    value={editFolder}
                    onChange={(e) => setEditFolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                  >
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        /{f}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
                <p>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    App Owner:
                  </span>{" "}
                  {editingAsset.appId === "general"
                    ? "🌐 Studio Global"
                    : editingAsset.appId}
                </p>
                <p>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    MIME Type:
                  </span>{" "}
                  {editingAsset.mimeType}
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  disabled={isSavingMetadata}
                  className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMetadata}
                  className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingMetadata ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal Dialog */}
      {qrModalAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Scan Asset QR Code
              </h3>
              <button
                onClick={() => setQrModalAsset(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl border border-zinc-200 flex items-center justify-center">
              {qrCodeUrl && (
                <Image
                  src={qrCodeUrl}
                  alt="QR Code"
                  width={240}
                  height={240}
                  className="rounded-lg"
                  unoptimized
                />
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                {qrModalAsset.assetId}
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                {qrModalAsset.publicUrl}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setQrModalAsset(null)}
                className="w-full py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Shadcn-Style Delete Confirmation Dialog */}
      <DeleteAssetDialog
        asset={assetToDelete}
        isOpen={Boolean(assetToDelete)}
        onClose={() => setAssetToDelete(null)}
        onSoftDelete={handleConfirmSoftDelete}
        onPermanentDelete={handleConfirmPermanentDelete}
      />
    </div>
  );
}
