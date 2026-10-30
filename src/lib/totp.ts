import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface TotpSetupData {
  secret: string;
  uri: string;
  qrCodeDataUrl: string;
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
 * Saves and enables 2FA for an admin user in DB
 */
export async function enableTwoFactor(
  email: string,
  secret: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const res = await db
    .update(adminUsers)
    .set({
      totpSecret: secret,
      isTwoFactorEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.email, normalizedEmail))
    .returning();

  return res.length > 0;
}

/**
 * Disables 2FA for an admin user in DB
 */
export async function disableTwoFactor(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const res = await db
    .update(adminUsers)
    .set({
      totpSecret: null,
      isTwoFactorEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.email, normalizedEmail))
    .returning();

  return res.length > 0;
}
