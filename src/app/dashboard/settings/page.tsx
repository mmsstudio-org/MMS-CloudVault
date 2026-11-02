import { auth } from "@/lib/auth";
import { isUserTwoFactorEnabled } from "@/lib/totp";
import {
  getSiteSettingsData,
  actionGetTelegramDeliveries,
  actionRetryTelegramDeliveries,
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
  const deliveries = await actionGetTelegramDeliveries();
  const is2FaActive = session?.user?.email
    ? await isUserTwoFactorEnabled(session.user.email)
    : false;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          System Settings & Storage Management
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage multi-cloud storage buckets, Sharp compression parameters,
          Telegram alerts, and administrator security whitelists.
        </p>
      </div>

      {/* 1. Dynamic Multi-Bucket S3/R2 Storage Manager */}
      <StorageBucketsManager initialBuckets={buckets} />

      <section className="p-5 rounded-2xl bg-card border border-border space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Telegram delivery history</h2>
          <form action={actionRetryTelegramDeliveries}>
            <button className="text-xs text-emerald-500" type="submit">Retry failed events</button>
          </form>
        </div>
        <p className="text-xs text-zinc-500">Sent means Telegram accepted the message. Device notifications depend on Telegram settings. Pending events retry automatically when the delivery worker runs.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead><tr><th className="p-2">Event</th><th>Status</th><th>Attempts</th><th>Message ID / Error</th></tr></thead>
            <tbody>{deliveries.map((row) => <tr key={String(row.id)} className="border-t border-border">
              <td className="p-2 max-w-xs truncate" title={String(row.event_key)}>{String(row.event_key)}</td>
              <td>{String(row.status)}</td><td>{String(row.attempts)}</td>
              <td>{String(row.message_id || row.last_error || "—")}</td>
            </tr>)}</tbody>
          </table>
          {!deliveries.length && <p className="p-2 text-zinc-500">No delivery events yet.</p>}
        </div>
      </section>

      {/* 2. Platform Optimization, Alerts & Whitelist Settings */}
      <SettingsForm
        initialSettings={settings}
        userEmail={session?.user?.email || "mr.sabbirmms@gmail.com"}
        initialTwoFactorEnabled={is2FaActive}
      />
    </div>
  );
}
