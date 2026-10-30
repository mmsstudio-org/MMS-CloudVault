import Link from "next/link";
import Image from "next/image";
import {
  Images,
  HardDrive,
  Zap,
  KeyRound,
  Trash2,
  UploadCloud,
  ExternalLink,
  Copy,
  ArrowRight,
} from "lucide-react";
import { getDashboardMetrics } from "@/lib/dashboard-actions";
import { CopyButton } from "@/components/copy-button";

export const metadata = {
  title: "Dashboard Overview",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 text-white shadow-md border border-zinc-700/50">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            System Operational
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-2">
            MMS Studio Media Infrastructure
          </h1>
          <p className="text-xs text-zinc-300 mt-1 max-w-xl">
            Automated Sharp WebP image processing pipeline, instant story deduplication, and zero-latency CDN object delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-100 transition shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            Upload Asset
          </Link>
          <Link
            href="/api-docs"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-600 transition cursor-pointer"
          >
            <span>Swagger API</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </Link>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500">Total Active Assets</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Images className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {metrics.totalAssets.toLocaleString()}
            </div>
            <Link
              href="/dashboard/gallery"
              className="text-[11px] text-blue-500 hover:underline inline-flex items-center gap-1 mt-1 font-medium"
            >
              Browse Gallery <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Current Storage */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500">Storage Utilized</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {metrics.totalStorageMb} MB
            </div>
            <span className="text-[11px] text-zinc-400 block mt-1">
              Raw size: {metrics.originalStorageMb} MB
            </span>
          </div>
        </div>

        {/* Sharp Savings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500">Sharp Compression</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-emerald-500">
              {metrics.savedPercent}% Saved
            </div>
            <span className="text-[11px] text-zinc-400 block mt-1">
              {metrics.savedStorageMb} MB bandwidth saved
            </span>
          </div>
        </div>

        {/* Connected Apps */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500">Connected Apps</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {metrics.appsCount} Active
            </div>
            <Link
              href="/dashboard/api-keys"
              className="text-[11px] text-purple-500 hover:underline inline-flex items-center gap-1 mt-1 font-medium"
            >
              Manage API Keys <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Uploads Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              Recent Media Assets
            </h2>
            <p className="text-xs text-zinc-500">
              Latest images processed and delivered through the API pipeline
            </p>
          </div>
          <Link
            href="/dashboard/gallery"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            View All Assets <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {metrics.recentAssets.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400">
            <Images className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="text-sm font-medium">No media assets uploaded yet.</p>
            <p className="text-xs text-zinc-500 mt-1">
              Use the web uploader or test the API via Swagger.
            </p>
            <Link
              href="/dashboard/upload"
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-medium"
            >
              Upload First Asset
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.recentAssets.map((asset) => (
              <div
                key={asset.id}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/50 transition group flex gap-3.5 items-center"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 relative border border-zinc-300/50 dark:border-zinc-700/50">
                  <Image
                    src={asset.publicUrl}
                    alt={asset.title || asset.storyId}
                    fill
                    className="object-cover group-hover:scale-105 transition"
                    unoptimized
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                      {asset.appId}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {asset.folder}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {asset.title || asset.storyId}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    ID: {asset.storyId} • {asset.optimizedSizeKb} KB
                  </p>
                </div>

                <CopyButton text={asset.publicUrl} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
