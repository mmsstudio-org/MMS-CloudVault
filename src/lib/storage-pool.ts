import {
  S3Client,
  HeadBucketCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { LRUCache } from "lru-cache";
import { StorageBucket } from "@/db/schema";

// In-Memory LRU Cache for live S3Client connection instances
// Keeps up to 50 active client connections alive in memory for zero-latency reuse
const clientPool = new LRUCache<string, S3Client>({
  max: 50,
  ttl: 1000 * 60 * 60, // 1 hour TTL
});

/**
 * Returns an active S3Client instance for a given storage bucket.
 * Reuses existing in-memory connection pool to avoid SSL/TCP handshake overhead.
 */
export function getS3ClientForBucket(bucket: Pick<
  StorageBucket,
  "id" | "endpoint" | "region" | "accessKeyId" | "secretAccessKey"
>): S3Client {
  const cached = clientPool.get(bucket.id);
  if (cached) {
    return cached;
  }

  const client = new S3Client({
    region: bucket.region || "auto",
    endpoint: bucket.endpoint,
    credentials: {
      accessKeyId: bucket.accessKeyId,
      secretAccessKey: bucket.secretAccessKey,
    },
    // Force path style is essential for S3-compatible endpoints (Neon, MinIO, Cloudflare R2)
    forcePathStyle: true,
  });

  clientPool.set(bucket.id, client);
  return client;
}

/**
 * Invalidates the in-memory S3Client cache for a specific bucket or all buckets.
 * Call this whenever credentials, endpoint, or bucket settings are modified in the admin UI.
 */
export function invalidateClientPool(bucketId?: string): void {
  if (bucketId) {
    clientPool.delete(bucketId);
  } else {
    clientPool.clear();
  }
}

export interface BucketTestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

/**
 * Live tests an S3/R2 bucket connection using lightweight HeadBucket or ListObjectsV2.
 * Used by the Admin Dashboard "Test Connection" button.
 */
export async function testBucketConnection(config: {
  endpoint: string;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<BucketTestResult> {
  const startTime = Date.now();
  const testClient = new S3Client({
    region: config.region || "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  try {
    // Attempt ListObjectsV2 with MaxKeys: 1 (compatible with all S3 providers, including Neon and R2)
    await testClient.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        MaxKeys: 1,
      })
    );
    const latencyMs = Date.now() - startTime;
    return {
      ok: true,
      message: `Connection successful! (${latencyMs}ms)`,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    let message = "Connection failed";

    if (err instanceof Error) {
      if (err.name === "InvalidAccessKeyId" || err.message.includes("403")) {
        message = "Authentication Failed: Invalid Access Key ID or Secret Access Key (HTTP 403)";
      } else if (err.name === "NoSuchBucket" || err.message.includes("404")) {
        message = `Bucket '${config.bucketName}' not found on endpoint (HTTP 404)`;
      } else if (err.message.includes("ENOTFOUND") || err.message.includes("ECONNREFUSED")) {
        message = "Network Error: Could not reach endpoint server";
      } else {
        message = `${err.name}: ${err.message}`;
      }
    }

    return {
      ok: false,
      message,
      latencyMs,
    };
  } finally {
    testClient.destroy();
  }
}
