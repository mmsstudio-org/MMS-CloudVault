import { db } from "./index";
import { siteSettings, apiKeys, adminUsers } from "./schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  console.log("🌱 Checking and seeding initial database state...");

  // 1. Site Settings
  const existingSettings = await db.select().from(siteSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(siteSettings).values({
      maxDimensionPx: 2048,
      maxFileKb: 1024,
      compressionQuality: 80,
      allowedAdminEmails: JSON.stringify(["sabbirmms@gmail.com"]),
      googleSiteVerification: "",
      googleSearchConsoleTag: "",
      telegramNotificationsEnabled: false,
    });
    console.log("✅ Seeded default site settings.");
  } else {
    console.log("ℹ️ Site settings already exist.");
  }

  // 2. Default API Key for Golpo Ghor App
  const existingKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.appId, "golpo-ghor"))
    .limit(1);

  if (existingKey.length === 0) {
    await db.insert(apiKeys).values({
      appName: "Golpo Ghor Android App",
      appId: "golpo-ghor",
      secretKey: "mms_sec_demo_golpo_ghor_2026",
      isActive: true,
    });
    console.log("✅ Seeded demo API key for Golpo Ghor Android App.");
  } else {
    console.log("ℹ️ API key for golpo-ghor already exists.");
  }

  // 3. Superadmin User
  const existingAdmin = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, "sabbirmms@gmail.com"))
    .limit(1);

  if (existingAdmin.length === 0) {
    await db.insert(adminUsers).values({
      email: "sabbirmms@gmail.com",
      name: "Sabbir MMS",
      role: "superadmin",
      isTwoFactorEnabled: false,
    });
    console.log("✅ Seeded superadmin user (sabbirmms@gmail.com).");
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
