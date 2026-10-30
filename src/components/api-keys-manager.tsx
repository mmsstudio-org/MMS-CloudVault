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
  Loader2,
  X,
} from "lucide-react";
import { ApiKey } from "@/db/schema";
import {
  actionCreateApiKey,
  actionToggleApiKeyStatus,
  actionRotateApiKey,
} from "@/lib/dashboard-actions";
import { toast } from "sonner";

interface ApiKeysManagerProps {
  initialKeys: ApiKey[];
}

export function ApiKeysManager({ initialKeys }: ApiKeysManagerProps) {
  const [keys, setKeys] = React.useState<ApiKey[]>(initialKeys);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [appName, setAppName] = React.useState("");
  const [appId, setAppId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [visibleKeys, setVisibleKeys] = React.useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

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
      const newKey = await actionCreateApiKey(appName, appId);
      setKeys((prev) => [newKey, ...prev]);
      toast.success(`API Key created for '${appName}'.`);
      setAppName("");
      setAppId("");
      setShowCreateModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create API key.");
    } finally {
      setIsSubmitting(false);
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
        }.`
      );
    } catch {
      toast.error("Failed to update API key status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRotate = async (key: ApiKey) => {
    if (
      !confirm(
        `Are you sure you want to rotate the secret key for '${key.appName}'? Connected mobile apps must be updated with the new key immediately.`
      )
    ) {
      return;
    }

    try {
      setActionLoadingId(key.id);
      const updated = await actionRotateApiKey(key.id);
      setKeys((prev) => prev.map((k) => (k.id === key.id ? updated : k)));
      toast.success(`Secret key rotated for '${key.appName}'. Cache invalidated.`);
    } catch {
      toast.error("Failed to rotate API key.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
            Application API Keys
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Dynamic, isolated authentication keys for mobile apps and external publishers with in-memory LRU caching.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New App Key</span>
        </button>
      </div>

      {/* Keys List */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
        {keys.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <KeyRound className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="text-xs font-semibold">No API keys registered.</p>
          </div>
        ) : (
          keys.map((key) => {
            const isVisible = visibleKeys[key.id];
            const isLoading = actionLoadingId === key.id;

            return (
              <div
                key={key.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/50 transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {key.appName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        key.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      }`}
                    >
                      {key.isActive ? "Active" : "Revoked"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>App ID (Slug):</span>
                    <code className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                      {key.appId}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(key.appId, "App ID")}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Secret Key Display */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-zinc-500">Secret:</span>
                    <code className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                      {isVisible
                        ? key.secretKey
                        : `${key.secretKey.substring(0, 10)}${"•".repeat(24)}`}
                    </code>
                    <button
                      type="button"
                      onClick={() => toggleVisibility(key.id)}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
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
                      onClick={() => copyToClipboard(key.secretKey, "Secret Key")}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
                      title="Copy Secret Key"
                    >
                      <Copy className="w-3.5 h-3.5" />
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
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
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
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
      <div className="p-5 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-950 border border-zinc-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Mobile App Header Integration
        </h3>
        <p className="text-xs text-zinc-300">
          Pass your secret key in the HTTP request header when uploading from Android/iOS apps:
        </p>
        <pre className="p-3 rounded-xl bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 font-mono text-xs text-emerald-400 overflow-x-auto">
{`POST /api/v1/upload HTTP/1.1
Host: storage.sabbirmms.com
x-api-key: mms_sec_YOUR_APP_KEY_HERE
Content-Type: multipart/form-data`}
        </pre>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Register New Application Key
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
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
                          .replace(/[^a-z0-9_-]/g, "-")
                      );
                    }
                  }}
                  placeholder="e.g. Golpo Ghor iOS App"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  App ID (Unique Slug) *
                </label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="e.g. golpo-ghor-ios"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none font-mono"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Used as the namespace directory for asset storage.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
