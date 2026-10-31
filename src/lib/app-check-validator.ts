import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Firebase App Check Public JWKS Key Set
 * Public certificates provided by Google to verify RS256 signatures of App Check tokens.
 */
const FIREBASE_APP_CHECK_JWKS_URL = new URL(
  "https://firebaseappcheck.googleapis.com/v1/jwks"
);

// Cached remote JWKS set to avoid re-fetching keys on every request
const JWKS = createRemoteJWKSet(FIREBASE_APP_CHECK_JWKS_URL);

export interface AppCheckVerificationOptions {
  enforceAppCheck: boolean;
  firebaseProjectId?: string | null;
  allowedAppIds?: string | null; // Comma-separated app IDs (e.g., "1:1234567890:android:abcdef, 1:1234567890:android:fedcba")
  allowedDebugTokens?: string | null; // Comma-separated device debug tokens (e.g. Mac, Laptop, QA phone)
}

export interface AppCheckVerificationResult {
  isValid: boolean;
  appId?: string;
  projectId?: string;
  error?: string;
}

/**
 * Validates an incoming Firebase App Check / Play Integrity JWT token.
 * 
 * Verification Steps:
 * 1. Checks if enforcement is required for the specific API key.
 * 2. Ensures token presence.
 * 3. Checks if token matches any registered dev/debug tokens for this key (Mac, Laptop, Test Phone).
 * 4. Otherwise, verifies cryptographic signature using Google's public RS256 JWKS keys.
 * 5. Verifies audience against the configured Firebase Project ID (if specified).
 * 6. Verifies subject against the authorized mobile App IDs (if specified).
 */
export async function validateAppCheckToken(
  token: string | null | undefined,
  options: AppCheckVerificationOptions
): Promise<AppCheckVerificationResult> {
  // If App Check enforcement is disabled for this API Key, pass immediately
  if (!options.enforceAppCheck) {
    return { isValid: true };
  }

  if (!token || typeof token !== "string" || token.trim() === "") {
    return {
      isValid: false,
      error: "Missing required X-Firebase-AppCheck header.",
    };
  }

  const cleanToken = token.trim();

  // Dynamic Debug Token Check (Device Whitelist from DB: Mac, Laptop, Emulator, QA phone)
  if (options.allowedDebugTokens && options.allowedDebugTokens.trim() !== "") {
    const debugTokens = options.allowedDebugTokens
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (debugTokens.includes(cleanToken)) {
      return {
        isValid: true,
        appId: "whitelisted-debug-device",
        projectId: options.firebaseProjectId || "debug-project",
      };
    }
  }

  try {
    // Verify cryptographic signature against Google Firebase App Check JWKS
    const { payload } = await jwtVerify(cleanToken, JWKS, {
      algorithms: ["RS256"],
    });

    const tokenAppId = (payload.sub as string) || (payload.app_id as string);
    const audiences = Array.isArray(payload.aud)
      ? payload.aud
      : payload.aud
      ? [payload.aud]
      : [];

    // Optional Project ID Audience check
    if (options.firebaseProjectId && options.firebaseProjectId.trim() !== "") {
      const targetProject = options.firebaseProjectId.trim();
      const expectedAudience = `projects/${targetProject}`;

      const matchedAudience = audiences.some((aud) =>
        typeof aud === "string" && (aud === expectedAudience || aud.endsWith(targetProject))
      );

      if (!matchedAudience) {
        return {
          isValid: false,
          error: `AppCheck token audience mismatch. Expected project: ${targetProject}`,
        };
      }
    }

    // Optional App ID whitelist check (e.g. Android App ID: "1:1234567890:android:34a0ec8763261a9b")
    if (options.allowedAppIds && options.allowedAppIds.trim() !== "") {
      const allowedList = options.allowedAppIds
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      if (allowedList.length > 0) {
        const normalizedTokenAppId = (tokenAppId || "").toLowerCase();
        const isAppAllowed = allowedList.includes(normalizedTokenAppId);

        if (!isAppAllowed) {
          return {
            isValid: false,
            appId: tokenAppId,
            error: `Unauthorized mobile App ID: '${tokenAppId}'. Must be in authorized app ID list.`,
          };
        }
      }
    }

    return {
      isValid: true,
      appId: tokenAppId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[AppCheck] Verification failed:", errorMsg);
    return {
      isValid: false,
      error: `AppCheck token validation failed: ${errorMsg}`,
    };
  }
}
