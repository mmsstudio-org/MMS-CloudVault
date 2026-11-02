import { SignJWT, jwtVerify } from "jose";

interface UploadTicket {
  appId: string;
  assetId: string;
  storageKey: string;
  publicUrl: string;
  bucketId: string;
}
function signingKey() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("An authentication secret is required for upload tickets.");
  return new TextEncoder().encode(secret);
}
export async function createUploadTicket(upload: UploadTicket) {
  return new SignJWT({ ...upload }).setProtectedHeader({ alg: "HS256" })
    .setIssuer("mms-storage-upload").setIssuedAt().setExpirationTime("30m").sign(signingKey());
}
export async function verifyUploadTicket(token: string, expected: UploadTicket) {
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"], issuer: "mms-storage-upload" });
    return Object.entries(expected).every(([key, value]) => payload[key] === value);
  } catch {
    return false;
  }
}
