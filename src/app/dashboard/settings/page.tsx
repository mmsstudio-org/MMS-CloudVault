import { auth } from "@/lib/auth";
import { getSiteSettingsData } from "@/lib/dashboard-actions";
import { SettingsForm } from "@/components/settings-form";

export const metadata = {
  title: "Site Settings & Security",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const settings = await getSiteSettingsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          System Settings & Platform Security
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Configure Sharp image compression rules, Telegram webhook alerts, Google verification keys, and authorized admin email whitelists.
        </p>
      </div>

      <SettingsForm
        initialSettings={settings}
        userEmail={session?.user?.email || "mr.sabbirmms@gmail.com"}
      />
    </div>
  );
}
