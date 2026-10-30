import { getApiKeysList } from "@/lib/dashboard-actions";
import { ApiKeysManager } from "@/components/api-keys-manager";

export const metadata = {
  title: "API Key Management",
};

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const keys = await getApiKeysList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          API Key Management
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Generate, rotate, or revoke application access tokens for programmatic media uploads.
        </p>
      </div>

      <ApiKeysManager initialKeys={keys} />
    </div>
  );
}
