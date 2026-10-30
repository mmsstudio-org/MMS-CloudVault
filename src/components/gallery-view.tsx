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
} from "lucide-react";
import { StoryAsset } from "@/db/schema";
import { CopyButton } from "./copy-button";
import { actionSoftDeleteAsset } from "@/lib/dashboard-actions";
import { toast } from "sonner";
import QRCode from "qrcode";

interface GalleryViewProps {
  initialAssets: StoryAsset[];
  apps: string[];
  folders: string[];
}

export function GalleryView({ initialAssets, apps, folders }: GalleryViewProps) {
  const [assets, setAssets] = React.useState<StoryAsset[]>(initialAssets);
  const [search, setSearch] = React.useState("");
  const [selectedApp, setSelectedApp] = React.useState("ALL");
  const [selectedFolder, setSelectedFolder] = React.useState("ALL");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [qrModalAsset, setQrModalAsset] = React.useState<StoryAsset | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Filter logic
  const filteredAssets = React.useMemo(() => {
    return assets.filter((asset) => {
      const matchApp = selectedApp === "ALL" || asset.appId === selectedApp;
      const matchFolder =
        selectedFolder === "ALL" || asset.folder === selectedFolder;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        asset.storyId.toLowerCase().includes(q) ||
        (asset.title && asset.title.toLowerCase().includes(q));

      return matchApp && matchFolder && matchSearch;
    });
  }, [assets, selectedApp, selectedFolder, search]);

  const handleDelete = async (id: string, storyId: string) => {
    if (!confirm(`Are you sure you want to move story '${storyId}' to trash?`)) {
      return;
    }
    try {
      setDeletingId(id);
      await actionSoftDeleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success(`Story '${storyId}' moved to trash.`);
    } catch {
      toast.error("Failed to delete asset.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenQr = async (asset: StoryAsset) => {
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
            placeholder="Search by Story ID or Title..."
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
                {app}
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

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900"
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
                  : "text-zinc-500 hover:text-zinc-900"
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
          <p className="text-xs text-zinc-500 mt-1">
            Try adjusting your search query or reset the app/folder filters.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
                <Image
                  src={asset.publicUrl}
                  alt={asset.title || asset.storyId}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                  unoptimized
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md">
                    {asset.appId}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900/70 text-zinc-300 backdrop-blur-md">
                    {asset.folder}
                  </span>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">
                    {asset.title || asset.storyId}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                    ID: {asset.storyId}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                    <span>{asset.width}x{asset.height} px</span>
                    <span>•</span>
                    <span>{asset.optimizedSizeKb} KB (WebP)</span>
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
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(asset.id, asset.storyId)}
                    disabled={deletingId === asset.id}
                    title="Move to Trash"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === asset.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/50 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 relative border border-zinc-200 dark:border-zinc-800">
                    <Image
                      src={asset.publicUrl}
                      alt={asset.title || asset.storyId}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {asset.appId}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        /{asset.folder}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {asset.title || asset.storyId}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">
                      ID: {asset.storyId} • {asset.width}x{asset.height} px • {asset.optimizedSizeKb} KB
                    </p>
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
                    onClick={() => handleDelete(asset.id, asset.storyId)}
                    disabled={deletingId === asset.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
                {qrModalAsset.storyId}
              </p>
              <p className="text-[11px] text-zinc-500 truncate">
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
    </div>
  );
}
