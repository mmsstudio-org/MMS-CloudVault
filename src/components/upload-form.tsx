"use client";

import * as React from "react";
import Image from "next/image";
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Plus,
  FolderPlus,
} from "lucide-react";
import { actionManualUpload } from "@/lib/dashboard-actions";
import { CopyButton } from "./copy-button";
import { toast } from "sonner";
import { StoryAsset } from "@/db/schema";

interface UploadFormProps {
  apps: { appName: string; appId: string }[];
  existingFolders: string[];
}

export function UploadForm({ apps, existingFolders }: UploadFormProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [selectedApp, setSelectedApp] = React.useState(apps[0]?.appId || "golpo-ghor");
  const [folder, setFolder] = React.useState("covers");
  const [isCustomFolder, setIsCustomFolder] = React.useState(false);
  const [customFolder, setCustomFolder] = React.useState("");
  const [storyId, setStoryId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadedResult, setUploadedResult] = React.useState<{
    asset: StoryAsset;
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

      // Auto-populate story ID if empty
      if (!storyId) {
        const cleanName = selected.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .toLowerCase();
        setStoryId(`story_${cleanName}`);
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select an image file to upload.");
      return;
    }
    if (!storyId.trim()) {
      toast.error("Story ID is required.");
      return;
    }

    const finalFolder = isCustomFolder ? customFolder.trim() : folder;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("app_id", selectedApp);
      formData.append("story_id", storyId.trim());
      formData.append("title", title.trim());
      formData.append("folder", finalFolder || "general");

      const res = await actionManualUpload(formData);
      setUploadedResult(res);
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
    setStoryId("");
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
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative aspect-video max-w-sm mx-auto rounded-xl overflow-hidden shadow-md border border-zinc-200 dark:border-zinc-700">
                <Image
                  src={previewUrl}
                  alt="Upload Preview"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                  Click or drag to change image
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:text-emerald-500 flex items-center justify-center mx-auto transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Click to browse or drag and drop an image
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    PNG, JPG, WEBP, GIF, SVG up to configured max size
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Inputs */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Asset Metadata & Routing
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
                    placeholder="e.g. banners, episodes"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none"
                  />
                ) : (
                  <select
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value="covers">covers</option>
                    <option value="episodes">episodes</option>
                    <option value="general">general</option>
                    {existingFolders
                      .filter((f) => !["covers", "episodes", "general"].includes(f))
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
              {/* Story ID */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Story ID (Unique Identifier) *
                </label>
                <input
                  type="text"
                  value={storyId}
                  onChange={(e) => setStoryId(e.target.value)}
                  placeholder="e.g. story_ep_102"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none font-mono"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Duplicate IDs replace existing images automatically.
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Story Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Midnight Echo"
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
                  ? "Existing Image Replaced!"
                  : "Asset Successfully Uploaded!"}
              </span>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/30">
              <Image
                src={uploadedResult.asset.publicUrl}
                alt="Uploaded"
                fill
                className="object-cover"
                unoptimized
              />
            </div>

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
                  <span className="text-zinc-500">Dimensions:</span>
                  <p className="font-semibold">{uploadedResult.asset.width}x{uploadedResult.asset.height} px</p>
                </div>
                <div>
                  <span className="text-zinc-500">Optimized Size:</span>
                  <p className="font-semibold text-emerald-500">{uploadedResult.asset.optimizedSizeKb} KB (WebP)</p>
                </div>
                <div>
                  <span className="text-zinc-500">Saved Space:</span>
                  <p className="font-semibold">{uploadedResult.savedKb} KB saved</p>
                </div>
                <div>
                  <span className="text-zinc-500">Story ID:</span>
                  <p className="font-mono">{uploadedResult.asset.storyId}</p>
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
                  <strong>WebP Format:</strong> Delivers superior compression and high fidelity for mobile apps.
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
                  <strong>Instant Deduplication:</strong> Same story ID automatically deletes old storage files and updates CDN references.
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
