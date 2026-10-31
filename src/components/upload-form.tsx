"use client";

import * as React from "react";
import Image from "next/image";
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  Music,
  Headphones,
  Layers,
  Trash2,
  X,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CopyButton } from "./copy-button";
import { toast } from "sonner";
import { MediaAsset } from "@/db/schema";
import { optimizeImageClientSide } from "@/lib/client-image-optimizer";

interface BatchQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  assetId: string;
  title: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  savedKb?: number;
}

interface UploadFormProps {
  apps: { appName: string; appId: string }[];
  existingFolders: string[];
}

export function UploadForm({ apps, existingFolders }: UploadFormProps) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [selectedApp, setSelectedApp] = React.useState(apps[0]?.appId || "general");
  const [folder, setFolder] = React.useState("general");
  const [isCustomFolder, setIsCustomFolder] = React.useState(false);
  const [customFolder, setCustomFolder] = React.useState("");
  const [assetId, setAssetId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [compressAudio, setCompressAudio] = React.useState(false);
  const [audioBitrate, setAudioBitrate] = React.useState<"96k" | "128k" | "192k" | "256k">("192k");
  const [isUploading, setIsUploading] = React.useState(false);

  // Multi-File Batch Queue State
  const [batchQueue, setBatchQueue] = React.useState<BatchQueueItem[]>([]);
  const [isBatchUploading, setIsBatchUploading] = React.useState(false);
  const [batchProgress, setBatchProgress] = React.useState({ completed: 0, total: 0 });

  const [uploadedResult, setUploadedResult] = React.useState<{
    asset: MediaAsset;
    isReplaced: boolean;
    savedKb: number;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processIncomingFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;

    // Single file selected and no queue active
    if (incoming.length === 1 && batchQueue.length === 0) {
      const selected = incoming[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setUploadedResult(null);

      const isAudio =
        selected.type.startsWith("audio/") ||
        /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(selected.name);
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
      return;
    }

    // Multiple files: populate or append to batch queue
    const newItems: BatchQueueItem[] = incoming.map((f, i) => {
      const cleanName = f.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase();
      const rawTitle = f.name.replace(/\.[^/.]+$/, "");
      return {
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file: f,
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
        assetId: `asset_${cleanName}`,
        title: rawTitle,
        status: "pending",
      };
    });

    setBatchQueue((prev) => [...prev, ...newItems]);
    setFile(null);
    setPreviewUrl(null);
    setUploadedResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleBatchUpload = async () => {
    if (batchQueue.length === 0) return;
    setIsBatchUploading(true);

    const finalFolder = isCustomFolder ? customFolder.trim() : folder;
    let successCount = 0;
    let totalSaved = 0;
    setBatchProgress({ completed: 0, total: batchQueue.length });

    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];
      if (item.status === "success") {
        successCount++;
        continue;
      }

      setBatchQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: "uploading" } : q))
      );

      try {
        // Pre-optimize image client-side to ensure payload is under Vercel's 4.5MB limit
        const uploadReadyFile = await optimizeImageClientSide(item.file);

        const formData = new FormData();
        formData.append("file", uploadReadyFile);
        formData.append("app_id", selectedApp);
        formData.append("asset_id", item.assetId.trim());
        formData.append("title", item.title.trim());
        formData.append("folder", finalFolder || "general");

        const isAudio =
          item.file.type.startsWith("audio/") ||
          /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(item.file.name);

        if (isAudio && compressAudio) {
          formData.append("compress_audio", "true");
          formData.append("audio_bitrate", audioBitrate);
        }

        const res = await fetch("/api/dashboard/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Upload failed");
        }

        successCount++;
        totalSaved += data.savedKb || 0;

        setBatchQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: "success",
                  savedKb: data.savedKb || 0,
                }
              : q
          )
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Failed";
        setBatchQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: "error",
                  error: errMsg,
                }
              : q
          )
        );
      } finally {
        setBatchProgress({ completed: i + 1, total: batchQueue.length });
      }
    }

    setIsBatchUploading(false);
    router.refresh();
    toast.success(
      `Batch upload complete: ${successCount} of ${batchQueue.length} assets processed! (${totalSaved} KB saved)`
    );
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
      // Pre-optimize image client-side to ensure payload is under Vercel's 4.5MB limit
      const uploadReadyFile = await optimizeImageClientSide(file);

      const formData = new FormData();
      formData.append("file", uploadReadyFile);
      formData.append("app_id", selectedApp);
      formData.append("asset_id", assetId.trim());
      formData.append("title", title.trim());
      formData.append("folder", finalFolder || "general");

      if (
        file.type.startsWith("audio/") ||
        /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)
      ) {
        if (compressAudio) {
          formData.append("compress_audio", "true");
          formData.append("audio_bitrate", audioBitrate);
        }
      }

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
    setBatchQueue([]);
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
            className="p-8 border-2 border-dashed border-zinc-300 border-border hover:border-zinc-400 hover:border-border-strong rounded-2xl bg-card/60 cursor-pointer transition text-center space-y-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              onChange={handleFileChange}
              className="hidden"
            />

            {batchQueue.length > 0 ? (
              <div
                className="space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        Batch Upload Queue ({batchQueue.length} files)
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {batchQueue.filter((q) => q.status === "success").length} uploaded •{" "}
                        {batchQueue.filter((q) => q.status === "pending").length} pending •{" "}
                        {batchQueue.filter((q) => q.status === "error").length} errors
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBatchUploading}
                      className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
                    >
                      + Add Files
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchQueue([])}
                      disabled={isBatchUploading}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-status-danger-bg transition cursor-pointer disabled:opacity-50"
                    >
                      Clear Queue
                    </button>
                  </div>
                </div>

                {isBatchUploading && (
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-2 transition-all duration-300"
                      style={{
                        width: `${(batchProgress.completed / Math.max(1, batchProgress.total)) * 100}%`,
                      }}
                    />
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto divide-y divide-border rounded-xl border border-border text-left">
                  {batchQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-muted shrink-0 relative overflow-hidden flex items-center justify-center border border-zinc-200 border-border">
                          {item.previewUrl ? (
                            <Image
                              src={item.previewUrl}
                              alt={item.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <Music className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">
                            {item.file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              ID:
                            </span>
                            <input
                              type="text"
                              value={item.assetId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchQueue((prev) =>
                                  prev.map((q, i) =>
                                    i === idx ? { ...q, assetId: val } : q
                                  )
                                );
                              }}
                              disabled={
                                item.status === "success" || isBatchUploading
                              }
                              className="text-[11px] font-mono px-2 py-0.5 rounded border border-border bg-muted text-foreground w-full focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "pending" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-zinc-500">
                            {Math.round(item.file.size / 1024)} KB
                          </span>
                        )}
                        {item.status === "uploading" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center gap-1 font-semibold">
                            <Loader2 className="w-3 h-3 animate-spin" /> Uploading
                          </span>
                        )}
                        {item.status === "success" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Saved (-{item.savedKb}KB)
                          </span>
                        )}
                        {item.status === "error" && (
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 flex items-center gap-1"
                            title={item.error}
                          >
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}

                        {!isBatchUploading && item.status !== "success" && (
                          <button
                            type="button"
                            onClick={() =>
                              setBatchQueue((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : previewUrl ? (
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
                <div className="relative aspect-video max-w-sm mx-auto rounded-xl overflow-hidden shadow-md border border-zinc-200 border-border">
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
                <div className="w-12 h-12 rounded-2xl bg-muted text-zinc-500 group-hover:text-emerald-500 flex items-center justify-center mx-auto transition">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Click to browse or drag and drop media
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Images or Audio (Select single or multiple files for batch upload)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Inputs */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Media Asset Routing & Identifier
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* App Selector */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Assign to Application
                </label>
                <select
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-none"
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
                  <label className="text-xs font-semibold text-foreground">
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-none"
                  />
                ) : (
                  <select
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-none"
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

            {/* If Single File Mode: show Asset ID & Title fields */}
            {batchQueue.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Asset ID */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Asset ID (Unique Identifier) *
                  </label>
                  <input
                    type="text"
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    placeholder="e.g. item_cover_001"
                    required={batchQueue.length === 0}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Duplicate Asset IDs replace existing images automatically.
                  </span>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Asset Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Main Hero Visual"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Audio Optimization & Compression Section */}
            {((file &&
              (file.type.startsWith("audio/") ||
                /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name))) ||
              batchQueue.some((q) =>
                /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(q.file.name)
              )) && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">
                      Audio Compression & Encoding (Optional)
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={compressAudio}
                      onChange={(e) => setCompressAudio(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-border"
                    />
                    <span>Enable Compression</span>
                  </label>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  By default, audio is preserved in 100% original fidelity without modification. Enable compression to optimize size.
                </p>

                {compressAudio && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Target Bitrate
                    </label>
                    <select
                      value={audioBitrate}
                      onChange={(e) =>
                        setAudioBitrate(
                          e.target.value as "96k" | "128k" | "192k" | "256k"
                        )
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground"
                    >
                      <option value="128k">
                        128 kbps (Voiceover / Speech - 50% smaller)
                      </option>
                      <option value="192k">
                        192 kbps (Standard High Quality - Recommended)
                      </option>
                      <option value="256k">
                        256 kbps (Studio Quality Music)
                      </option>
                      <option value="96k">
                        96 kbps (Ultra-compact Dialogue)
                      </option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              {batchQueue.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setBatchQueue([])}
                    disabled={isBatchUploading}
                    className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                  >
                    Clear Queue
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchUpload}
                    disabled={
                      isBatchUploading ||
                      batchQueue.every((q) => q.status === "success")
                    }
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-md shadow-cyan-500/20"
                  >
                    {isBatchUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          Uploading ({batchProgress.completed}/{batchProgress.total})...
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>
                          Upload All {batchQueue.filter((q) => q.status !== "success").length} Assets
                        </span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {file && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!file || isUploading}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
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
                </>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Result / Info Sidebar Column */}
      <div className="space-y-6">
        {batchQueue.length > 0 ? (
          <div className="p-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-foreground space-y-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2 text-cyan-500 font-bold text-sm">
              <Layers className="w-5 h-5" />
              <span>Batch Queue Overview</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/70 bg-muted border border-cyan-500/10">
                <span className="text-[11px] text-zinc-500">Total Files</span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {batchQueue.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/70 bg-muted border border-cyan-500/10">
                <span className="text-[11px] text-zinc-500">Completed</span>
                <p className="text-base font-bold text-emerald-500 mt-0.5">
                  {batchQueue.filter((q) => q.status === "success").length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/70 bg-muted border border-cyan-500/10">
                <span className="text-[11px] text-zinc-500">Total Saved</span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {batchQueue.reduce((acc, q) => acc + (q.savedKb || 0), 0)} KB
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/70 bg-muted border border-cyan-500/10">
                <span className="text-[11px] text-zinc-500">Target App</span>
                <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                  {selectedApp === "general" ? "🌐 Global" : selectedApp}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Files are processed with Sharp webp optimization and stored directly in your target bucket under /{isCustomFolder ? customFolder.trim() || "general" : folder}.
            </p>
          </div>
        ) : uploadedResult ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-foreground space-y-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
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
                <span className="text-muted-foreground block text-[11px]">Public CDN URL:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="text"
                    readOnly
                    value={uploadedResult.asset.publicUrl}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-[11px] font-mono text-zinc-900 text-foreground"
                  />
                  <CopyButton text={uploadedResult.asset.publicUrl} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                <div>
                  <span className="text-muted-foreground">
                    {uploadedResult.asset.mimeType.startsWith("audio/") ? "Media Type:" : "Dimensions:"}
                  </span>
                  <p className="font-semibold text-foreground">
                    {uploadedResult.asset.mimeType.startsWith("audio/")
                      ? "Audio Track"
                      : `${uploadedResult.asset.width}x${uploadedResult.asset.height} px`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {uploadedResult.asset.mimeType.startsWith("audio/") ? "Audio Size:" : "Optimized Size:"}
                  </span>
                  <p className="font-semibold text-emerald-500">
                    {uploadedResult.asset.optimizedSizeKb} KB
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Folder:</span>
                  <p className="font-semibold text-foreground">{uploadedResult.asset.folder}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Asset ID:</span>
                  <p className="font-mono text-foreground truncate">{uploadedResult.asset.assetId}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Sharp Optimization Specs
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2.5">
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
