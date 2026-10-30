"use client";

import * as React from "react";
import Image from "next/image";
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  Music,
  Headphones,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CopyButton } from "./copy-button";
import { toast } from "sonner";
import { MediaAsset } from "@/db/schema";

interface UploadFormProps {
  apps: { appName: string; appId: string }[];
  existingFolders: string[];
}

export function UploadForm({ apps, existingFolders }: UploadFormProps) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [selectedApp, setSelectedApp] = React.useState(apps[0]?.appId || "main-app");
  const [folder, setFolder] = React.useState("general");
  const [isCustomFolder, setIsCustomFolder] = React.useState(false);
  const [customFolder, setCustomFolder] = React.useState("");
  const [assetId, setAssetId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadedResult, setUploadedResult] = React.useState<{
    asset: MediaAsset;
    isReplaced: boolean;
    savedKb: number;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setUploadedResult(null);

      const isAudio = selected.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(selected.name);
      if (isAudio && folder === "general") {
        setFolder("audio");
      }

      // Auto-populate asset ID if empty
      if (!assetId) {
        const cleanName = selected.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .toLowerCase();
        setAssetId(`asset_${cleanName}`);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setUploadedResult(null);

      const isAudio = selected.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(selected.name);
      if (isAudio && folder === "general") {
        setFolder("audio");
      }

      if (!assetId) {
        const cleanName = selected.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .toLowerCase();
        setAssetId(`asset_${cleanName}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a media file (image or audio) to upload.");
      return;
    }
    if (!assetId.trim()) {
      toast.error("Asset ID is required.");
      return;
    }

    const finalFolder = isCustomFolder ? customFolder.trim() : folder;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("app_id", selectedApp);
      formData.append("asset_id", assetId.trim());
      formData.append("title", title.trim());
      formData.append("folder", finalFolder || "general");

      const response = await fetch("/api/dashboard/upload", {
        method: "POST",
        body: formData,
      });

      const res = await response.json();
      if (!response.ok || !res.success) {
        throw new Error(res.error || "Upload failed.");
      }

      setUploadedResult(res);
      router.refresh();
      toast.success(
        res.isReplaced
          ? "Asset successfully replaced existing image!"
          : "Asset successfully optimized and saved!"
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setAssetId("");
    setTitle("");
    setUploadedResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Upload Form Column */}
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900/60 cursor-pointer transition text-center space-y-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              file && (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-md mx-auto p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700 text-left shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold uppercase">
                        Audio Track
                      </span>
                      <p className="text-xs font-bold text-white truncate mt-0.5">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        {Math.round(file.size / 1024)} KB
                      </p>
                    </div>
                  </div>

                  <audio controls src={previewUrl} className="w-full h-9 rounded-lg" />

                  <p
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-center text-zinc-400 hover:text-white mt-2 cursor-pointer transition underline"
                  >
                    Click to choose a different file
                  </p>
                </div>
              ) : (
                <div className="relative aspect-video max-w-sm mx-auto rounded-xl overflow-hidden shadow-md border border-zinc-200 dark:border-zinc-700">
                  <Image
                    src={previewUrl}
                    alt="Upload Preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                    Click or drag to change file
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:text-emerald-500 flex items-center justify-center mx-auto transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Click to browse or drag and drop media
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Images (JPG, PNG, WEBP, GIF, SVG) or Audio (MP3, WAV, OGG, M4A, AAC)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Inputs */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Media Asset Routing & Identifier
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* App Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Assign to Application
                </label>
                <select
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none"
                >
                  {apps.map((app) => (
                    <option key={app.appId} value={app.appId}>
                      {app.appName} ({app.appId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Folder Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Target Folder
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomFolder(!isCustomFolder)}
                    className="text-[11px] text-emerald-500 hover:underline flex items-center gap-1"
                  >
                    {isCustomFolder ? "Pick Existing" : "+ New Folder"}
                  </button>
                </div>

                {isCustomFolder ? (
                  <input
                    type="text"
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                    placeholder="e.g. banners, products, avatars"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none"
                  />
                ) : (
                  <select
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value="general">general</option>
                    <option value="covers">covers</option>
                    <option value="banners">banners</option>
                    <option value="audio">audio</option>
                    <option value="media">media</option>
                    {existingFolders
                      .filter((f) => !["general", "covers", "banners", "audio", "media"].includes(f))
                      .map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Asset ID */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Asset ID (Unique Identifier) *
                </label>
                <input
                  type="text"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="e.g. item_cover_001"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none font-mono"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Duplicate Asset IDs replace existing images automatically.
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Asset Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Main Hero Visual"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {file && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  Reset
                </button>
              )}
              <button
                type="submit"
                disabled={!file || isUploading}
                className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing & Optimizing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Optimize Asset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Result / Info Sidebar Column */}
      <div className="space-y-6">
        {uploadedResult ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-zinc-900 dark:text-white space-y-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {uploadedResult.isReplaced
                  ? "Existing Asset Replaced!"
                  : "Asset Successfully Uploaded!"}
              </span>
            </div>

            {uploadedResult.asset.mimeType.startsWith("audio/") ? (
              <div className="p-4 rounded-xl bg-zinc-950 text-white border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">
                      {uploadedResult.asset.title || uploadedResult.asset.assetId}
                    </p>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {uploadedResult.asset.mimeType}
                    </span>
                  </div>
                </div>
                <audio controls src={uploadedResult.asset.publicUrl} className="w-full h-8" />
              </div>
            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/30">
                <Image
                  src={uploadedResult.asset.publicUrl}
                  alt="Uploaded"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-500 block text-[11px]">Public CDN URL:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="text"
                    readOnly
                    value={uploadedResult.asset.publicUrl}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-mono"
                  />
                  <CopyButton text={uploadedResult.asset.publicUrl} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                <div>
                  <span className="text-zinc-500">
                    {uploadedResult.asset.mimeType.startsWith("audio/") ? "Media Type:" : "Dimensions:"}
                  </span>
                  <p className="font-semibold">
                    {uploadedResult.asset.mimeType.startsWith("audio/")
                      ? "Audio Track"
                      : `${uploadedResult.asset.width}x${uploadedResult.asset.height} px`}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">
                    {uploadedResult.asset.mimeType.startsWith("audio/") ? "Audio Size:" : "Optimized Size:"}
                  </span>
                  <p className="font-semibold text-emerald-500">
                    {uploadedResult.asset.optimizedSizeKb} KB
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Folder:</span>
                  <p className="font-semibold">{uploadedResult.asset.folder}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Asset ID:</span>
                  <p className="font-mono truncate">{uploadedResult.asset.assetId}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Sharp Optimization Specs
            </h3>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Aspect Ratio Scaling:</strong> Downscales proportionally if larger than configured Max Dimensions.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>WebP Format:</strong> Delivers superior compression and high fidelity for all apps.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Progressive Trimming:</strong> Iteratively compresses to guarantee the file stays under the configured KB ceiling.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Instant Deduplication:</strong> Same Asset ID automatically deletes old storage files and updates CDN references.
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
