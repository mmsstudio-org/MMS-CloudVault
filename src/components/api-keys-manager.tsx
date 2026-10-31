"use client";

import * as React from "react";
import {
  KeyRound,
  Plus,
  RotateCcw,
  Check,
  Copy,
  Eye,
  EyeOff,
  Power,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Smartphone,
  Loader2,
  X,
  HardDrive,
  Settings2,
  Image as ImageIcon,
  Music,
} from "lucide-react";
import { ApiKey } from "@/db/schema";
import {
  BucketWithAssetStats,
  actionCreateApiKey,
  actionToggleApiKeyStatus,
  actionRotateApiKey,
  actionUpdateApiKeyBuckets,
  actionUpdateApiKeySecurity,
} from "@/lib/dashboard-actions";
import { toast } from "sonner";

interface ApiKeysManagerProps {
  initialKeys: ApiKey[];
  initialBuckets: BucketWithAssetStats[];
}

export function ApiKeysManager({
  initialKeys,
  initialBuckets,
}: ApiKeysManagerProps) {
  const [keys, setKeys] = React.useState<ApiKey[]>(initialKeys);
  const [buckets] = React.useState<BucketWithAssetStats[]>(initialBuckets);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [appName, setAppName] = React.useState("");
  const [appId, setAppId] = React.useState("");
  const [createDefaultBucketId, setCreateDefaultBucketId] =
    React.useState<string>(
      buckets.find((b) => b.isDefault)?.id || buckets[0]?.id || "",
    );
  const [createImageBucketId, setCreateImageBucketId] =
    React.useState<string>("");
  const [createAudioBucketId, setCreateAudioBucketId] =
    React.useState<string>("");

  // Edit Routing Modal State
  const [editingRoutingKey, setEditingRoutingKey] =
    React.useState<ApiKey | null>(null);
  const [editDefaultBucketId, setEditDefaultBucketId] =
    React.useState<string>("");
  const [editImageBucketId, setEditImageBucketId] = React.useState<string>("");
  const [editAudioBucketId, setEditAudioBucketId] = React.useState<string>("");
  const [isUpdatingRouting, setIsUpdatingRouting] = React.useState(false);

  // App Check Create Modal State
  const [createEnforceAppCheck, setCreateEnforceAppCheck] =
    React.useState(false);
  const [createFirebaseProjectId, setCreateFirebaseProjectId] =
    React.useState("");
  const [createAllowedAppIds, setCreateAllowedAppIds] = React.useState("");
  const [createAllowedDebugTokens, setCreateAllowedDebugTokens] =
    React.useState("");

  // Edit Security & App Check Modal State
  const [editingSecurityKey, setEditingSecurityKey] =
    React.useState<ApiKey | null>(null);
  const [editEnforceAppCheck, setEditEnforceAppCheck] = React.useState(false);
  const [editFirebaseProjectId, setEditFirebaseProjectId] = React.useState("");
  const [editAllowedAppIds, setEditAllowedAppIds] = React.useState("");
  const [editAllowedDebugTokens, setEditAllowedDebugTokens] =
    React.useState("");
  const [isUpdatingSecurity, setIsUpdatingSecurity] = React.useState(false);

  // Rotate Key Confirmation Modal State
  const [keyToRotate, setKeyToRotate] = React.useState<ApiKey | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [visibleKeys, setVisibleKeys] = React.useState<Record<string, boolean>>(
    {},
  );
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(
    null,
  );

  const bucketMap = React.useMemo(() => {
    const map = new Map<string, BucketWithAssetStats>();
    buckets.forEach((b) => map.set(b.id, b));
    return map;
  }, [buckets]);

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim() || !appId.trim()) {
      toast.error("App name and App ID are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const newKey = await actionCreateApiKey(
        appName,
        appId,
        createDefaultBucketId || null,
        createImageBucketId || null,
        createAudioBucketId || null,
        createEnforceAppCheck,
        createFirebaseProjectId || null,
        createAllowedAppIds || null,
        createAllowedDebugTokens || null,
      );
      setKeys((prev) => [newKey, ...prev]);
      toast.success(`API Key created for '${appName}'.`);
      setAppName("");
      setAppId("");
      setCreateImageBucketId("");
      setCreateAudioBucketId("");
      setCreateEnforceAppCheck(false);
      setCreateFirebaseProjectId("");
      setCreateAllowedAppIds("");
      setCreateAllowedDebugTokens("");
      setShowCreateModal(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create API key.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSecurityModal = (k: ApiKey) => {
    setEditingSecurityKey(k);
    setEditEnforceAppCheck(k.enforceAppCheck || false);
    setEditFirebaseProjectId(k.firebaseProjectId || "");
    setEditAllowedAppIds(k.allowedAppIds || "");
    setEditAllowedDebugTokens(k.allowedDebugTokens || "");
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSecurityKey) return;

    try {
      setIsUpdatingSecurity(true);
      const updated = await actionUpdateApiKeySecurity(editingSecurityKey.id, {
        enforceAppCheck: editEnforceAppCheck,
        firebaseProjectId: editFirebaseProjectId || null,
        allowedAppIds: editAllowedAppIds || null,
        allowedDebugTokens: editAllowedDebugTokens || null,
      });

      setKeys((prev) =>
        prev.map((k) =>
          k.id === editingSecurityKey.id ? { ...k, ...updated } : k,
        ),
      );
      toast.success(
        `Security policies updated for '${editingSecurityKey.appName}'.`,
      );
      setEditingSecurityKey(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update security policies.",
      );
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  const openRoutingModal = (k: ApiKey) => {
    setEditingRoutingKey(k);
    setEditDefaultBucketId(
      k.defaultBucketId ||
        buckets.find((b) => b.isDefault)?.id ||
        buckets[0]?.id ||
        "",
    );
    setEditImageBucketId(k.imageBucketId || "");
    setEditAudioBucketId(k.audioBucketId || "");
  };

  const handleSaveRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoutingKey) return;

    try {
      setIsUpdatingRouting(true);
      const updated = await actionUpdateApiKeyBuckets(editingRoutingKey.id, {
        defaultBucketId: editDefaultBucketId || null,
        imageBucketId: editImageBucketId || null,
        audioBucketId: editAudioBucketId || null,
      });

      setKeys((prev) =>
        prev.map((k) => (k.id === editingRoutingKey.id ? updated : k)),
      );
      toast.success(
        `Storage routing updated for '${editingRoutingKey.appName}'!`,
      );
      setEditingRoutingKey(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update storage routing.",
      );
    } finally {
      setIsUpdatingRouting(false);
    }
  };

  const handleToggleStatus = async (key: ApiKey) => {
    try {
      setActionLoadingId(key.id);
      const updated = await actionToggleApiKeyStatus(key.id, key.isActive);
      setKeys((prev) => prev.map((k) => (k.id === key.id ? updated : k)));
      toast.success(
        `API Key for '${key.appName}' ${
          updated.isActive ? "activated" : "deactivated"
        }.`,
      );
    } catch {
      toast.error("Failed to update API key status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRotate = (key: ApiKey) => {
    setKeyToRotate(key);
  };

  const confirmRotate = async () => {
    if (!keyToRotate) return;
    const targetKey = keyToRotate;

    try {
      setActionLoadingId(targetKey.id);
      const updated = await actionRotateApiKey(targetKey.id);
      setKeys((prev) => prev.map((k) => (k.id === targetKey.id ? updated : k)));
      toast.success(
        `Secret key rotated for '${targetKey.appName}'. Cache invalidated.`,
      );
      setKeyToRotate(null);
    } catch {
      toast.error("Failed to rotate API key.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            Application API Keys & Storage Routing
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dynamic, isolated authentication keys for mobile apps and external
            publishers with optional media-type bucket routing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New App Key</span>
        </button>
      </div>

      {/* Keys List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm divide-y divide-border">
        {keys.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <KeyRound className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-semibold">No API keys registered.</p>
          </div>
        ) : (
          keys.map((key) => {
            const isVisible = visibleKeys[key.id];
            const isLoading = actionLoadingId === key.id;

            const defaultBucket = key.defaultBucketId
              ? bucketMap.get(key.defaultBucketId)
              : buckets.find((b) => b.isDefault);
            const imageBucket = key.imageBucketId
              ? bucketMap.get(key.imageBucketId)
              : null;
            const audioBucket = key.audioBucketId
              ? bucketMap.get(key.audioBucketId)
              : null;

            return (
              <div
                key={key.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/50 transition"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">
                      {key.appName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        key.isActive
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}
                    >
                      {key.isActive ? "Active" : "Revoked"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>App ID (Slug):</span>
                    <div>
                      <code className="px-2 py-0.5 rounded-md bg-muted font-mono text-[11px] text-foreground">
                        {key.appId}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(key.appId, "App ID")}
                        className="text-zinc-400 hover:text-foreground"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Secret Key Display */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Secret:
                    </span>
                    <div>
                      <code className="px-2.5 py-1 rounded-md bg-muted font-mono text-xs text-foreground">
                        {isVisible
                          ? key.secretKey
                          : `${key.secretKey.substring(0, 10)}${"•".repeat(20)}`}
                      </code>
                      <button
                        type="button"
                        onClick={() => toggleVisibility(key.id)}
                        className="text-zinc-400 hover:text-foreground p-1"
                        title={isVisible ? "Hide Key" : "Show Key"}
                      >
                        {isVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(key.secretKey, "Secret Key")
                        }
                        className="text-zinc-400 hover:text-foreground p-1"
                        title="Copy Secret Key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Storage Routing Badges */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                    <span className="text-zinc-400 font-medium">
                      Storage Routing:
                    </span>
                    <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-medium">
                        <HardDrive className="w-3 h-3" />
                        Default: {defaultBucket?.name || "System Default"}
                      </span>

                      {imageBucket && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                          <ImageIcon className="w-3 h-3" />
                          Images ➔ {imageBucket.name}
                        </span>
                      )}

                      {audioBucket && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 border border-orange-500/20 font-medium">
                          <Music className="w-3 h-3" />
                          Audio ➔ {audioBucket.name}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => openRoutingModal(key)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-foreground underline ml-1"
                      >
                        <Settings2 className="w-3 h-3" />
                        Configure Routing
                      </button>
                    </div>
                  </div>

                  {/* Mobile Security (Firebase App Check & Play Integrity) */}
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap text-[11px]">
                    <span className="text-zinc-400 font-medium">
                      Mobile Security:
                    </span>
                    {key.enforceAppCheck ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        Play Integrity & App Check Enforced
                        {key.firebaseProjectId && (
                          <span className="opacity-75 font-mono text-[10px]">
                            ({key.firebaseProjectId})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-normal">
                        <Shield className="w-3 h-3 text-zinc-400" />
                        Standard (App Check Optional)
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => openSecurityModal(key)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 hover:underline ml-1"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      Security & App Check
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRotate(key)}
                    disabled={isLoading}
                    title="Rotate Key (Generates new secret)"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rotate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(key)}
                    disabled={isLoading}
                    title={key.isActive ? "Deactivate Key" : "Activate Key"}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50 ${
                      key.isActive
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{key.isActive ? "Revoke" : "Activate"}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Integration Guide Box */}
      <div className="p-5 rounded-2xl bg-surface-elevated text-foreground border border-border-strong shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Mobile App Header Integration
        </h3>
        <p className="text-xs text-zinc-300">
          Pass your secret key in the HTTP request header when uploading from
          Android/iOS apps or backend pipelines:
        </p>
        <pre className="p-3 rounded-xl bg-zinc-950 bg-card border border-zinc-800 font-mono text-xs text-emerald-400 overflow-x-auto">
          {`POST /api/v1/upload HTTP/1.1
Host: storage.sabbirmms.com
x-api-key: mms_sec_YOUR_APP_KEY_HERE
Content-Type: multipart/form-data`}
        </pre>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0 bg-card">
              <h3 className="text-sm font-bold text-foreground">
                Register New Application Key
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Application Title / Name *
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => {
                      setAppName(e.target.value);
                      if (!appId) {
                        setAppId(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]/g, "-"),
                        );
                      }
                    }}
                    placeholder="e.g. Golpo Ghor iOS App"
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    App ID (Unique Slug) *
                  </label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="e.g. golpo-ghor-ios"
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-hidden focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Used as the namespace directory for asset storage.
                  </span>
                </div>

                {/* Bucket Routing Options */}
                <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                    Multi-Bucket Routing (Optional)
                  </p>

                  {/* Default Bucket */}
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Default Storage Bucket
                    </label>
                    <select
                      value={createDefaultBucketId}
                      onChange={(e) => setCreateDefaultBucketId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground"
                    >
                      {buckets.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.isDefault ? "(Active Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dedicated Image Bucket */}
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Dedicated Image Bucket (Optional)
                    </label>
                    <select
                      value={createImageBucketId}
                      onChange={(e) => setCreateImageBucketId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground"
                    >
                      <option value="">-- Inherit Default Bucket --</option>
                      {buckets.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dedicated Audio Bucket */}
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Dedicated Audio Bucket (Optional)
                    </label>
                    <select
                      value={createAudioBucketId}
                      onChange={(e) => setCreateAudioBucketId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground"
                    >
                      <option value="">-- Inherit Default Bucket --</option>
                      {buckets.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mobile App Security (Firebase App Check & Play Integrity) */}
                <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Firebase App Check & Play Integrity
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          Require Google-signed cryptographic token from Android
                          devices
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createEnforceAppCheck}
                        onChange={(e) =>
                          setCreateEnforceAppCheck(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-hidden rounded-full peer bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {createEnforceAppCheck && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div>
                        <label className="block text-[11px] font-semibold text-foreground mb-1">
                          Firebase Project ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={createFirebaseProjectId}
                          onChange={(e) =>
                            setCreateFirebaseProjectId(e.target.value)
                          }
                          placeholder="e.g. mms-studio-media-vault"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground font-mono"
                        />
                        <span className="text-[10px] text-zinc-400 mt-0.5 block">
                          Verifies that tokens originate exclusively from this
                          Firebase project.
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-foreground mb-1">
                          Allowed Mobile App IDs (Optional)
                        </label>
                        <input
                          type="text"
                          value={createAllowedAppIds}
                          onChange={(e) =>
                            setCreateAllowedAppIds(e.target.value)
                          }
                          placeholder="e.g. 1:1234567890:android:abcdef, 1:1234567890:android:34a0ec8763261a9b"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground font-mono"
                        />
                        <span className="text-[10px] text-zinc-400 mt-0.5 block">
                          Comma-separated Firebase App IDs to whitelist. Leave
                          empty to allow any valid app in the project.
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-foreground mb-1">
                          Device Debug Secrets / Test Tokens (Optional)
                        </label>
                        <input
                          type="text"
                          value={createAllowedDebugTokens}
                          onChange={(e) =>
                            setCreateAllowedDebugTokens(e.target.value)
                          }
                          placeholder="e.g. mac-debug-secret-1, laptop-debug-secret-2"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground font-mono"
                        />
                        <span className="text-[10px] text-zinc-400 mt-0.5 block">
                          Comma-separated debug secrets for your Mac, Laptop,
                          physical test phones or QA emulators.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="border-t border-border px-6 py-3.5 shrink-0 bg-card/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-600 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Security & App Check Policy Modal */}
      {editingSecurityKey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0 bg-card">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  App Check & Play Integrity Policy
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Configure hardware-backed mobile attestation for &apos;
                  {editingSecurityKey.appName}&apos;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSecurityKey(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveSecurity}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain">
                {/* Enforce Switch */}
                <div className="p-3.5 rounded-xl bg-muted border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Enforce Firebase App Check
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      Blocks all requests missing a valid Google-signed JWT
                      token.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editEnforceAppCheck}
                      onChange={(e) => setEditEnforceAppCheck(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-hidden rounded-full peer bg-muted peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Project ID */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Firebase Project ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={editFirebaseProjectId}
                    onChange={(e) => setEditFirebaseProjectId(e.target.value)}
                    placeholder="e.g. mms-studio-media-vault"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-muted text-foreground font-mono"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Ensures the App Check JWT audience matches your Firebase
                    Project.
                  </span>
                </div>

                {/* Allowed App IDs */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Whitelisted Mobile App IDs (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={editAllowedAppIds}
                    onChange={(e) => setEditAllowedAppIds(e.target.value)}
                    placeholder="e.g. 1:1234567890:android:34a0ec8763261a9b, 1:1234567890:android:fedcba9876543210"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-muted text-foreground font-mono resize-none"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Comma-separated Firebase Android App IDs. Only requests from
                    these apps will be approved.
                  </span>
                </div>

                {/* Allowed Debug Tokens */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Device Debug Secrets / Test Tokens (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={editAllowedDebugTokens}
                    onChange={(e) => setEditAllowedDebugTokens(e.target.value)}
                    placeholder="e.g. mac-debug-123, laptop-debug-456, 12345678-abcd-ef01-2345-6789abcdef01"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-muted text-foreground font-mono resize-none"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Add debug tokens for your Mac, Laptop, or test devices.
                    Rotate or update anytime dynamically with zero server
                    restarts.
                  </span>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="border-t border-border px-6 py-3.5 shrink-0 bg-card/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSecurityKey(null)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSecurity}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isUpdatingSecurity && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Save Security Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Storage Routing Modal */}
      {editingRoutingKey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0 bg-card">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Storage Routing for {editingRoutingKey.appName}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Assign dedicated cloud buckets for images and audio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoutingKey(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-foreground hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveRouting}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Default Storage Bucket
                  </label>
                  <select
                    value={editDefaultBucketId}
                    onChange={(e) => setEditDefaultBucketId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground"
                  >
                    {buckets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.isDefault ? "(Active Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Dedicated Image Bucket (Optional)
                  </label>
                  <select
                    value={editImageBucketId}
                    onChange={(e) => setEditImageBucketId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground"
                  >
                    <option value="">-- Inherit Default Bucket --</option>
                    {buckets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Dedicated Audio Bucket (Optional)
                  </label>
                  <select
                    value={editAudioBucketId}
                    onChange={(e) => setEditAudioBucketId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground"
                  >
                    <option value="">-- Inherit Default Bucket --</option>
                    {buckets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="border-t border-border px-6 py-3.5 shrink-0 bg-card/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoutingKey(null)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRouting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-600 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isUpdatingRouting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Save Routing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rotate Secret Key Confirmation Modal */}
      {keyToRotate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-amber-500/30 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Rotate API Secret Key?
                </h3>
                <p className="text-xs text-muted-foreground">
                  {keyToRotate.appName} ({keyToRotate.appId})
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 leading-relaxed space-y-1.5">
              <p className="font-semibold">
                Warning: Rotating this key will immediately revoke the existing secret.
              </p>
              <p className="text-[11px] opacity-90">
                Any connected mobile app or backend service using the old key will be rejected immediately until updated with the newly generated secret. In-memory validation cache will also be purged.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setKeyToRotate(null)}
                disabled={actionLoadingId === keyToRotate.id}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRotate}
                disabled={actionLoadingId === keyToRotate.id}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {actionLoadingId === keyToRotate.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rotating...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rotate Secret Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
