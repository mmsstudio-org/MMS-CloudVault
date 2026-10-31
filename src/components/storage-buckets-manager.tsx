"use client";

import * as React from "react";
import {
  HardDrive,
  Plus,
  Check,
  Eye,
  EyeOff,
  Radio,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Server,
  Cloud,
  Layers,
  Sparkles,
  Info,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  BucketWithAssetStats,
  actionCreateStorageBucket,
  actionUpdateStorageBucket,
  actionSetDefaultStorageBucket,
  actionDeleteStorageBucket,
  actionTestStorageBucketConnection,
} from "@/lib/dashboard-actions";
import { toast } from "sonner";

interface StorageBucketsManagerProps {
  initialBuckets: BucketWithAssetStats[];
}

export function StorageBucketsManager({
  initialBuckets,
}: StorageBucketsManagerProps) {
  const [buckets, setBuckets] =
    React.useState<BucketWithAssetStats[]>(initialBuckets);
  const [showModal, setShowModal] = React.useState(false);
  const [editingBucket, setEditingBucket] =
    React.useState<BucketWithAssetStats | null>(null);

  // Form State
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [provider, setProvider] = React.useState("s3_compatible");
  const [endpoint, setEndpoint] = React.useState("");
  const [bucketName, setBucketName] = React.useState("");
  const [region, setRegion] = React.useState("auto");
  const [accessKeyId, setAccessKeyId] = React.useState("");
  const [secretAccessKey, setSecretAccessKey] = React.useState("");
  const [publicBaseUrl, setPublicBaseUrl] = React.useState("");
  const [maxCapacityGb, setMaxCapacityGb] = React.useState(5);
  const [isDefault, setIsDefault] = React.useState(false);

  // Form reveal toggles
  const [showFormAccessKey, setShowFormAccessKey] = React.useState(false);
  const [showFormSecretKey, setShowFormSecretKey] = React.useState(false);

  // Card reveal toggles by bucket ID
  const [visibleCredentials, setVisibleCredentials] = React.useState<
    Record<string, { key: boolean; secret: boolean }>
  >({});

  // Loading & Testing states
  const [isSaving, setIsSaving] = React.useState(false);
  const [testingBucketId, setTestingBucketId] = React.useState<string | null>(
    null
  );
  const [isTestingModalConnection, setIsTestingModalConnection] =
    React.useState(false);
  const [modalTestResult, setModalTestResult] = React.useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [bucketToDelete, setBucketToDelete] =
    React.useState<BucketWithAssetStats | null>(null);
  const [isDeletingBucket, setIsDeletingBucket] = React.useState(false);

  const toggleCardKey = (bucketId: string) => {
    setVisibleCredentials((prev) => ({
      ...prev,
      [bucketId]: {
        key: !prev[bucketId]?.key,
        secret: prev[bucketId]?.secret || false,
      },
    }));
  };

  const toggleCardSecret = (bucketId: string) => {
    setVisibleCredentials((prev) => ({
      ...prev,
      [bucketId]: {
        key: prev[bucketId]?.key || false,
        secret: !prev[bucketId]?.secret,
      },
    }));
  };

  const openCreateModal = () => {
    setEditingBucket(null);
    setName("");
    setSlug("");
    setNotes("");
    setProvider("s3_compatible");
    setEndpoint("");
    setBucketName("");
    setRegion("auto");
    setAccessKeyId("");
    setSecretAccessKey("");
    setPublicBaseUrl("");
    setMaxCapacityGb(5);
    setIsDefault(buckets.length === 0);
    setModalTestResult(null);
    setShowModal(true);
  };

  const openEditModal = (b: BucketWithAssetStats) => {
    setEditingBucket(b);
    setName(b.name);
    setSlug(b.slug);
    setNotes(b.notes || "");
    setProvider(b.provider);
    setEndpoint(b.endpoint);
    setBucketName(b.bucketName);
    setRegion(b.region);
    setAccessKeyId(b.accessKeyId);
    setSecretAccessKey(b.secretAccessKey);
    setPublicBaseUrl(b.publicBaseUrl || "");
    setMaxCapacityGb(b.maxCapacityGb);
    setIsDefault(b.isDefault);
    setModalTestResult(null);
    setShowModal(true);
  };

  const handleTestModalConnection = async () => {
    if (!endpoint || !bucketName || !accessKeyId || !secretAccessKey) {
      toast.error(
        "Please fill in Endpoint, Bucket Name, Access Key, and Secret Key before testing."
      );
      return;
    }

    try {
      setIsTestingModalConnection(true);
      setModalTestResult(null);

      const res = await actionTestStorageBucketConnection({
        endpoint,
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
      });

      setModalTestResult(res);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Connection probe failed";
      setModalTestResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTestingModalConnection(false);
    }
  };

  const handleTestCardConnection = async (bucket: BucketWithAssetStats) => {
    try {
      setTestingBucketId(bucket.id);
      const res = await actionTestStorageBucketConnection({
        bucketId: bucket.id,
      });

      if (res.ok) {
        toast.success(`[${bucket.name}] ${res.message}`);
      } else {
        toast.error(`[${bucket.name}] ${res.message}`);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Connection probe failed"
      );
    } finally {
      setTestingBucketId(null);
    }
  };

  const handleSetDefault = async (bucket: BucketWithAssetStats) => {
    try {
      await actionSetDefaultStorageBucket(bucket.id);
      setBuckets((prev) =>
        prev.map((b) => ({
          ...b,
          isDefault: b.id === bucket.id,
        }))
      );
      toast.success(`'${bucket.name}' is now set as the active default storage bucket!`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to set default bucket."
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeletingBucket(true);
      const res = await actionDeleteStorageBucket(id);
      if (res.success) {
        setBuckets((prev) => prev.filter((b) => b.id !== id));
        toast.success("Storage bucket deleted successfully.");
        setBucketToDelete(null);
      } else {
        toast.error(res.error || "Failed to delete storage bucket.");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete storage bucket."
      );
    } finally {
      setIsDeletingBucket(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !endpoint.trim() || !bucketName.trim()) {
      toast.error("Please enter a bucket name, endpoint, and bucket name.");
      return;
    }

    const finalSlug =
      slug.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .trim();

    try {
      setIsSaving(true);

      if (editingBucket) {
        const updated = await actionUpdateStorageBucket(editingBucket.id, {
          name,
          slug: finalSlug,
          notes: notes.trim() || null,
          provider,
          endpoint,
          bucketName,
          region,
          accessKeyId,
          secretAccessKey,
          publicBaseUrl: publicBaseUrl.trim() || null,
          maxCapacityGb: Number(maxCapacityGb) || 5,
          isDefault,
        });

        setBuckets((prev) =>
          prev.map((b) =>
            b.id === editingBucket.id
              ? {
                  ...b,
                  ...updated,
                  isDefault,
                }
              : isDefault
              ? { ...b, isDefault: false }
              : b
          )
        );
        toast.success(`Bucket '${updated.name}' updated successfully!`);
      } else {
        const created = await actionCreateStorageBucket({
          name,
          slug: finalSlug,
          notes,
          provider,
          endpoint,
          bucketName,
          region,
          accessKeyId,
          secretAccessKey,
          publicBaseUrl: publicBaseUrl.trim() || undefined,
          maxCapacityGb: Number(maxCapacityGb) || 5,
          isDefault,
        });

        setBuckets((prev) => [
          { ...created, assetCount: 0 },
          ...prev.map((b) => (isDefault ? { ...b, isDefault: false } : b)),
        ]);
        toast.success(`New storage bucket '${created.name}' created successfully!`);
      }

      setShowModal(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save storage bucket."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getProviderBadge = (p: string) => {
    switch (p) {
      case "neon":
      case "s3_compatible":
        return {
          label: "Neon / S3 Compatible",
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "cloudflare_r2":
        return {
          label: "Cloudflare R2 ($0 Egress)",
          bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
        };
      case "aws":
        return {
          label: "Amazon AWS S3",
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        };
      case "minio":
        return {
          label: "MinIO Self-Hosted",
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        };
      default:
        return {
          label: "S3 Object Storage",
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              Multi-Cloud Storage Buckets & Vaults
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                v2.0 Dynamic Engine
              </span>
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Connect multiple S3/R2 object storage providers. Dynamically route
              images and audio, switch active buckets with zero downtime, and
              test connectivity live.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Storage Bucket
        </button>
      </div>

      {/* Buckets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {buckets.map((b) => {
          const providerBadge = getProviderBadge(b.provider);
          const isTestingThis = testingBucketId === b.id;
          const showKey = visibleCredentials[b.id]?.key || false;
          const showSecret = visibleCredentials[b.id]?.secret || false;

          const usedMb = (Number(b.usedBytes) / (1024 * 1024)).toFixed(1);
          const maxGb = b.maxCapacityGb || 5;
          const maxMb = maxGb * 1024;
          const usedPercent = Math.min(
            100,
            Math.round((Number(usedMb) / maxMb) * 100)
          );

          return (
            <div
              key={b.id}
              className={`p-6 rounded-2xl bg-white dark:bg-zinc-900 border transition-all shadow-sm flex flex-col justify-between ${
                b.isDefault
                  ? "border-cyan-500/50 dark:border-cyan-500/40 ring-1 ring-cyan-500/20"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {/* Top Row: Name, Provider, Default Badge */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        {b.name}
                      </h3>
                      {b.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Active Default
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-md border ${providerBadge.bg}`}
                    >
                      {providerBadge.label}
                    </span>
                  </div>

                  {/* Test Connection Button */}
                  <button
                    type="button"
                    onClick={() => handleTestCardConnection(b)}
                    disabled={isTestingThis}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {isTestingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                    ) : (
                      <Radio className="w-3.5 h-3.5 text-cyan-500" />
                    )}
                    Test Connection
                  </button>
                </div>

                {/* Notes Field (Admin Understanding Note) */}
                {b.notes && (
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span>{b.notes}</span>
                  </div>
                )}

                {/* Storage Configuration Metadata */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Bucket Name:</span>
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {b.bucketName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Endpoint:</span>
                    <span
                      className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[220px]"
                      title={b.endpoint}
                    >
                      {b.endpoint}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Region:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {b.region || "auto"}
                    </span>
                  </div>

                  {b.publicBaseUrl && (
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Public CDN Domain:</span>
                      <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 truncate max-w-[200px]">
                        {b.publicBaseUrl}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Physical Assets Stored:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {b.assetCount} item(s)
                    </span>
                  </div>
                </div>

                {/* Secure Credentials View with Eye Toggle */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400">Access Key ID:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {showKey
                          ? b.accessKeyId
                          : `${b.accessKeyId.slice(0, 8)}••••••••`}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCardKey(b.id)}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        title={showKey ? "Hide key" : "Show key"}
                      >
                        {showKey ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 dark:text-zinc-400">Secret Access Key:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {showSecret
                          ? b.secretAccessKey
                          : "••••••••••••••••••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCardSecret(b.id)}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        title={showSecret ? "Hide secret" : "Show secret"}
                      >
                        {showSecret ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Storage Quota Progress */}
                <div className="pt-2 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                    <span>Storage Usage</span>
                    <span>
                      {usedMb} MB / {maxGb} GB ({usedPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usedPercent > 90
                          ? "bg-rose-500"
                          : usedPercent > 70
                          ? "bg-amber-500"
                          : "bg-cyan-500"
                      }`}
                      style={{ width: `${Math.max(2, usedPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                <div>
                  {!b.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(b)}
                      className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Set as Default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(b)}
                    className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Edit configuration"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setBucketToDelete(b)}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete bucket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Storage Bucket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {editingBucket
                      ? "Edit Storage Bucket"
                      : "Register New Storage Bucket"}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Configure S3 / R2 API credentials, endpoint, region, and
                    delivery CDN.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Row 1: Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingBucket) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]/g, "-")
                        );
                      }
                    }}
                    placeholder="e.g. Cloudflare R2 Audio Vault"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Slug Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. r2-audio-vault"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Row 2: Admin Notes / Understanding Note */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Bucket Note / Description (For Your Reference)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Dedicated high-capacity bucket for Remotion audio clips & SFX with zero egress bandwidth fees."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500 resize-y leading-relaxed"
                />
              </div>

              {/* Row 3: Provider & Bucket Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Storage Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="s3_compatible">
                      Neon S3 / Generic S3 Compatible
                    </option>
                    <option value="cloudflare_r2">
                      Cloudflare R2 ($0 Egress)
                    </option>
                    <option value="aws">Amazon AWS S3</option>
                    <option value="minio">MinIO Self-Hosted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    S3 Bucket Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="e.g. mms-cloud-vault"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Row 4: S3 Endpoint & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    S3 Endpoint URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://<account>.r2.cloudflarestorage.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="auto or ap-southeast-1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Row 5: Access Key & Secret Key with Eye Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Access Key ID *
                  </label>
                  <div className="relative">
                    <input
                      type={showFormAccessKey ? "text" : "password"}
                      required
                      value={accessKeyId}
                      onChange={(e) => setAccessKeyId(e.target.value)}
                      placeholder="Access Key"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormAccessKey(!showFormAccessKey)}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      {showFormAccessKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Secret Access Key *
                  </label>
                  <div className="relative">
                    <input
                      type={showFormSecretKey ? "text" : "password"}
                      required
                      value={secretAccessKey}
                      onChange={(e) => setSecretAccessKey(e.target.value)}
                      placeholder="Secret Access Key"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormSecretKey(!showFormSecretKey)}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      {showFormSecretKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 6: Public CDN Base URL & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Public Delivery Base URL (Optional CDN)
                  </label>
                  <input
                    type="url"
                    value={publicBaseUrl}
                    onChange={(e) => setPublicBaseUrl(e.target.value)}
                    placeholder="https://cdn.sabbirmms.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Max Capacity Ceiling (GB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxCapacityGb}
                    onChange={(e) => setMaxCapacityGb(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Default Active Checkbox */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800">
                <input
                  type="checkbox"
                  id="is_default_checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-zinc-300 dark:border-zinc-700"
                />
                <label
                  htmlFor="is_default_checkbox"
                  className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    Set as Active Default Storage Bucket
                  </span>{" "}
                  (New API uploads without specific routing will use this
                  bucket)
                </label>
              </div>

              {/* Live Test Connection Button inside Modal */}
              <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                    Pre-Flight Connection Check
                  </p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Verify credentials against the live S3 API before saving.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestModalConnection}
                  disabled={isTestingModalConnection}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-xs"
                >
                  {isTestingModalConnection ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  Test S3 Connection
                </button>
              </div>

              {/* Test Result Message Box */}
              {modalTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                    modalTestResult.ok
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                  }`}
                >
                  {modalTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{modalTestResult.message}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBucket ? "Save Changes" : "Register Storage Bucket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Bucket Confirmation Dialog (Custom Shadcn UI Alert Dialog) */}
      {bucketToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => !isDeletingBucket && setBucketToDelete(null)}
          />

          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    bucketToDelete.isDefault || bucketToDelete.assetCount > 0
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {bucketToDelete.isDefault || bucketToDelete.assetCount > 0
                      ? "Bucket Protected"
                      : "Delete Storage Bucket"}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Review bucket status before proceeding
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBucketToDelete(null)}
                disabled={isDeletingBucket}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bucket Info Card */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {bucketToDelete.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                  {bucketToDelete.bucketName}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 truncate">
                {bucketToDelete.endpoint}
              </p>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-200/60 dark:border-zinc-700/50">
                <span className="text-zinc-600 dark:text-zinc-400">Stored Assets:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {bucketToDelete.assetCount} item(s)
                </span>
              </div>
            </div>

            {/* Condition 1: Active Default Bucket */}
            {bucketToDelete.isDefault && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-bold">Cannot delete active default bucket.</p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  This bucket is currently designated as the primary default. Please promote another bucket to default before removing this one.
                </p>
              </div>
            )}

            {/* Condition 2: Bucket Has Stored Assets */}
            {!bucketToDelete.isDefault && bucketToDelete.assetCount > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-bold">Accidental Data Loss Protection</p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  This bucket holds {bucketToDelete.assetCount} media asset(s). To protect your files from being orphaned or lost, you must purge or migrate these assets before the bucket can be deleted.
                </p>
              </div>
            )}

            {/* Condition 3: Safe to Delete */}
            {!bucketToDelete.isDefault && bucketToDelete.assetCount === 0 && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                <p className="font-bold">Are you sure you want to unregister this bucket?</p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  This bucket is empty. Connection credentials and settings will be permanently removed from your dashboard.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBucketToDelete(null)}
                disabled={isDeletingBucket}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                {bucketToDelete.isDefault || bucketToDelete.assetCount > 0
                  ? "Understood"
                  : "Cancel"}
              </button>

              {!bucketToDelete.isDefault && bucketToDelete.assetCount === 0 && (
                <button
                  type="button"
                  onClick={() => handleDelete(bucketToDelete.id)}
                  disabled={isDeletingBucket}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingBucket ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete Bucket</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
