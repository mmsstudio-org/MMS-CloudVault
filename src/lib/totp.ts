import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const TWO_FACTOR_COOKIE_NAME = "mms_2fa_session";

export interface TotpSetupData {
  secret: string;
  uri: string;
  qrCodeDataUrl: string;
}

const getSecretKey = () => {
  const secret =
    process.env.NEXTAUTH_SECRET || "mms-studio-storage-fallback-secret-2026";
  return createHash("sha256").update(secret).digest();
};

/**
 * Creates a cryptographically signed 2FA session token
 */
export async function create2FaSessionToken(email: string): Promise<string> {
  const secretKey = getSecretKey();
  return await new SignJWT({ email: email.toLowerCase().trim() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

/**
 * Verifies that a 2FA session token is valid and belongs to the given email
 */
export async function verify2FaSessionToken(
  token: string | undefined | null,
  expectedEmail: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return (
      typeof payload.email === "string" &&
      payload.email.toLowerCase().trim() === expectedEmail.toLowerCase().trim()
    );
  } catch {
    return false;
  }
}

/**
 * Checks whether an administrator has 2FA enabled in the database
 */
export async function isUserTwoFactorEnabled(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await db
    .select({ isTwoFactorEnabled: adminUsers.isTwoFactorEnabled })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  return user.length > 0 && user[0].isTwoFactorEnabled === true;
}

/**
 * Retrieves the stored TOTP secret for an administrator if 2FA is active
 */
export async function getUserTotpSecret(email: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await db
    .select({
      totpSecret: adminUsers.totpSecret,
      isTwoFactorEnabled: adminUsers.isTwoFactorEnabled,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  if (!user.length || !user[0].isTwoFactorEnabled || !user[0].totpSecret) {
    return null;
  }
  return user[0].totpSecret;
}

/**
 * Generates a new 2FA TOTP secret and QR code for Google Authenticator
 */
export async function generateTotpSetup(
  email: string
): Promise<TotpSetupData> {
  const secret = generateSecret();
  const uri = generateURI({
    issuer: "MMS CloudVault",
    label: email,
    secret,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    width: 250,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return {
    secret,
    uri,
    qrCodeDataUrl,
  };
}

/**
 * Verifies a 6-digit TOTP code against the secret
 */
export function verifyTotpCode(secret: string, token: string): boolean {
  try {
    const cleanToken = token.trim();
    const result = verifySync({ token: cleanToken, secret });
    return result.valid;
  } catch (err) {
    console.error("TOTP verification error:", err);
    return false;
  }
}

/**
 * Generates an array of single-use backup recovery codes (format: XXXX-XXXX)
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Saves and enables 2FA for an admin user in DB along with fresh recovery codes
 */
export async function enableTwoFactor(
  email: string,
  secret: string
): Promise<{ success: boolean; recoveryCodes: string[] }> {
  const normalizedEmail = email.toLowerCase().trim();
  const recoveryCodes = generateRecoveryCodes(8);

  const res = await db
    .update(adminUsers)
    .set({
      totpSecret: secret,
      isTwoFactorEnabled: true,
      recoveryCodes,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.email, normalizedEmail))
    .returning();

  return { success: res.length > 0, recoveryCodes };
}

/**
 * Disables 2FA for an admin user in DB and clears secret & recovery codes
 */
export async function disableTwoFactor(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const res = await db
    .update(adminUsers)
    .set({
      totpSecret: null,
      isTwoFactorEnabled: false,
      recoveryCodes: null,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.email, normalizedEmail))
    .returning();

  return res.length > 0;
}

/**
 * Retrieves the remaining active recovery codes for an admin user
 */
export async function getUserRecoveryCodes(email: string): Promise<string[]> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await db
    .select({
      recoveryCodes: adminUsers.recoveryCodes,
      isTwoFactorEnabled: adminUsers.isTwoFactorEnabled,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  if (!user.length || !user[0].isTwoFactorEnabled || !user[0].recoveryCodes) {
    return [];
  }
  return user[0].recoveryCodes;
}

/**
 * Generates a fresh set of recovery codes for an active 2FA admin
 */
export async function regenerateUserRecoveryCodes(
  email: string
): Promise<string[]> {
  const normalizedEmail = email.toLowerCase().trim();
  const recoveryCodes = generateRecoveryCodes(8);

  await db
    .update(adminUsers)
    .set({
      recoveryCodes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(adminUsers.email, normalizedEmail),
        eq(adminUsers.isTwoFactorEnabled, true)
      )
    );

  return recoveryCodes;
}

/**
 * Verifies and consumes a single-use backup recovery code
 */
export async function verifyAndConsumeRecoveryCode(
  email: string,
  inputCode: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = inputCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");

  const user = await db
    .select({
      recoveryCodes: adminUsers.recoveryCodes,
      isTwoFactorEnabled: adminUsers.isTwoFactorEnabled,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  if (!user.length || !user[0].isTwoFactorEnabled || !user[0].recoveryCodes) {
    return false;
  }

  const codes = user[0].recoveryCodes;
  const matchIndex = codes.findIndex(
    (c) => c.toUpperCase() === cleanCode || c.replace(/-/g, "").toUpperCase() === cleanCode.replace(/-/g, "")
  );

  if (matchIndex === -1) {
    return false;
  }

  // Atomically remove the consumed code
  const remainingCodes = codes.filter((_, i) => i !== matchIndex);
  await db
    .update(adminUsers)
    .set({
      recoveryCodes: remainingCodes,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.email, normalizedEmail));

  return true;
}

/**
 * Validates a user's 2FA challenge via either 6-digit TOTP or backup recovery code
 */
export async function verifyUserTwoFactorChallenge(
  email: string,
  code: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.trim();

  const [user] = await db
    .select({
      totpSecret: adminUsers.totpSecret,
      isTwoFactorEnabled: adminUsers.isTwoFactorEnabled,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  if (!user) return false;
  if (!user.isTwoFactorEnabled || !user.totpSecret) {
    // 2FA is not enabled on this user account
    return true;
  }

  // Check standard 6-digit TOTP code
  if (/^\d{6}$/.test(cleanCode)) {
    const isValidTotp = verifyTotpCode(user.totpSecret, cleanCode);
    if (isValidTotp) return true;
  }

  // Check backup recovery code
  return await verifyAndConsumeRecoveryCode(normalizedEmail, cleanCode);
}
