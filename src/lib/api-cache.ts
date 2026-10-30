import { LRUCache } from "lru-cache";
import { db } from "@/db";
import { apiKeys, ApiKey } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface CachedApiValidation {
  isValid: boolean;
  apiKey?: ApiKey;
  cachedAt: number;
}

// Global LRU Cache for high-frequency mobile app API calls
// Max 10,000 active keys, 15-minute TTL
const keyCache = new LRUCache<string, CachedApiValidation>({
  max: 10000,
  ttl: 1000 * 60 * 15, // 15 minutes
});

/**
 * Validates an incoming x-api-key with zero-database overhead when cached
 */
export async function validateApiKey(
  secretKey: string | null | undefined
): Promise<{ isValid: boolean; app?: ApiKey }> {
  if (!secretKey || typeof secretKey !== "string" || secretKey.trim() === "") {
    return { isValid: false };
  }

  const trimmedKey = secretKey.trim();

  // 1. Check in-memory LRU Cache
  const cached = keyCache.get(trimmedKey);
  if (cached) {
    return { isValid: cached.isValid, app: cached.apiKey };
  }

  // 2. Query database
  try {
    const records = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.secretKey, trimmedKey), eq(apiKeys.isActive, true)))
      .limit(1);

    if (records.length > 0) {
      const app = records[0];
      keyCache.set(trimmedKey, {
        isValid: true,
        apiKey: app,
        cachedAt: Date.now(),
      });
      return { isValid: true, app };
    }

    // Negative cache for 1 minute to prevent DB hammer on invalid keys
    keyCache.set(trimmedKey, { isValid: false, cachedAt: Date.now() }, { ttl: 60 * 1000 });
    return { isValid: false };
  } catch (err) {
    console.error("Database error during API key validation:", err);
    return { isValid: false };
  }
}

/**
 * Instantly invalidates an API key from memory cache upon dashboard updates/rotations
 */
export function invalidateApiKeyCache(secretKey?: string) {
  if (secretKey) {
    keyCache.delete(secretKey);
  } else {
    keyCache.clear();
  }
}
