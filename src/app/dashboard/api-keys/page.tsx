import {
  getApiKeysList,
  actionGetStorageBuckets,
} from "@/lib/dashboard-actions";
import { ApiKeysManager } from "@/components/api-keys-manager";

export const metadata = {
  title: "API Key Management & Bucket Routing",
};

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const [keys, buckets] = await Promise.all([
    getApiKeysList(),
    actionGetStorageBuckets(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          API Key Management & Storage Routing
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Generate, rotate, or revoke application access tokens. Optionally route
          images and audio to dedicated cloud storage buckets per API key.
        </p>
      </div>

      <ApiKeysManager initialKeys={keys} initialBuckets={buckets} />
    </div>
  );
}
