import { auth } from "@/lib/auth";
import {
  getSiteSettingsData,
  actionGetStorageBuckets,
} from "@/lib/dashboard-actions";
import { SettingsForm } from "@/components/settings-form";
import { StorageBucketsManager } from "@/components/storage-buckets-manager";

export const metadata = {
  title: "Site Settings & Storage Vaults",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const settings = await getSiteSettingsData();
  const buckets = await actionGetStorageBuckets();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          System Settings & Storage Management
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage multi-cloud storage buckets, Sharp compression parameters,
          Telegram alerts, and administrator security whitelists.
        </p>
      </div>

      {/* 1. Dynamic Multi-Bucket S3/R2 Storage Manager */}
      <StorageBucketsManager initialBuckets={buckets} />

      {/* 2. Platform Optimization, Alerts & Whitelist Settings */}
      <SettingsForm
        initialSettings={settings}
        userEmail={session?.user?.email || "mr.sabbirmms@gmail.com"}
      />
    </div>
  );
}
