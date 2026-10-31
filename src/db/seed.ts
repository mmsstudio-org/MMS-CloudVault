import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { db } from "./index";
import {
  siteSettings,
  apiKeys,
  adminUsers,
  storageBuckets,
  mediaAssets,
} from "./schema";
import { eq, isNull } from "drizzle-orm";

export async function seedDatabase() {
  console.log("🌱 Checking and seeding initial database state...");

  // 1. Site Settings
  const existingSettings = await db.select().from(siteSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(siteSettings).values({
      maxDimensionPx: 2048,
      maxFileKb: 1024,
      compressionQuality: 80,
      allowedAdminEmails: JSON.stringify(["mr.sabbirmms@gmail.com"]),
      googleSiteVerification: "",
      googleSearchConsoleTag: "",
      telegramNotificationsEnabled: false,
    });
    console.log("✅ Seeded default site settings.");
  } else {
    console.log("ℹ️ Site settings already exist.");
  }

  // 2. Storage Buckets (Default Neon S3 Vault)
  let defaultBucket = (
    await db
      .select()
      .from(storageBuckets)
      .where(eq(storageBuckets.slug, "neon-primary-vault"))
      .limit(1)
  )[0];

  if (!defaultBucket) {
    const inserted = await db
      .insert(storageBuckets)
      .values({
        name: "Neon S3 Primary Vault",
        slug: "neon-primary-vault",
        notes: "Default Neon S3 storage bucket for high-speed cloud assets",
        provider: "s3_compatible",
        endpoint:
          process.env.STORAGE_ENDPOINT ||
          "https://br-still-snow-aoeg0x94.storage.c-2.ap-southeast-1.aws.neon.tech",
        bucketName: process.env.STORAGE_BUCKET_NAME || "mms-cloud-vault",
        region: process.env.STORAGE_REGION || "ap-southeast-1",
        accessKeyId:
          process.env.STORAGE_ACCESS_KEY ||
          "nak_live_c0556fef153d42bfb6498f633c7f1598",
        secretAccessKey:
          process.env.STORAGE_SECRET_KEY ||
          "nsk_live_8492ced2f941d12fcc57cafb51e1cfa20c519d7c354fae27acb5617d2be073d8",
        publicBaseUrl: process.env.STORAGE_PUBLIC_URL || null,
        isDefault: true,
        isActive: true,
        maxCapacityGb: 5,
        usedBytes: 0,
      })
      .returning();
    defaultBucket = inserted[0];
    console.log("✅ Seeded default storage bucket: Neon S3 Primary Vault.");
  } else {
    console.log("ℹ️ Storage bucket 'neon-primary-vault' already exists.");
  }

  // 3. Default API Key for Demo App
  const existingKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.appId, "mms-portal"))
    .limit(1);

  if (existingKey.length === 0) {
    await db.insert(apiKeys).values({
      appName: "MMS CloudVault Web Portal",
      appId: "mms-portal",
      secretKey: "mms_sec_demo_portal_2026",
      isActive: true,
      defaultBucketId: defaultBucket.id,
    });
    console.log("✅ Seeded demo API key for MMS CloudVault Web Portal.");
  } else {
    // If existingKey has no defaultBucketId, link it
    if (!existingKey[0].defaultBucketId) {
      await db
        .update(apiKeys)
        .set({ defaultBucketId: defaultBucket.id })
        .where(eq(apiKeys.id, existingKey[0].id));
      console.log("✅ Linked existing API key to default storage bucket.");
    }
  }

  // 4. Update any unlinked media_assets to point to defaultBucket
  await db
    .update(mediaAssets)
    .set({ bucketId: defaultBucket.id })
    .where(isNull(mediaAssets.bucketId));

  // 5. Superadmin User
  const existingAdmin = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, "mr.sabbirmms@gmail.com"))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(adminUsers).values({
      email: "mr.sabbirmms@gmail.com",
      name: "Sabbir MMS",
      role: "superadmin",
      isTwoFactorEnabled: false,
    });
    console.log("✅ Seeded superadmin user (mr.sabbirmms@gmail.com).");
  } else {
    console.log("ℹ️ Superadmin already exists.");
  }

  console.log("✨ Seeding completed successfully!");
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
