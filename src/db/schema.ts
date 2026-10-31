import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  serial,
  uniqueIndex,
  bigint,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// 1. SITE SETTINGS TABLE (Global configuration & dynamic capping)
// -----------------------------------------------------------------------------
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  maxDimensionPx: integer("max_dimension_px").default(2048).notNull(),
  maxFileKb: integer("max_file_kb").default(1024).notNull(),
  compressionQuality: integer("compression_quality").default(80).notNull(),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  telegramNotificationsEnabled: boolean("telegram_notifications_enabled")
    .default(false)
    .notNull(),
  googleSiteVerification: text("google_site_verification"),
  googleSearchConsoleTag: text("google_search_console_tag"),
  allowedAdminEmails: text("allowed_admin_emails")
    .default('["mr.sabbirmms@gmail.com"]')
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// -----------------------------------------------------------------------------
// 2. STORAGE BUCKETS TABLE (Dynamic multi-cloud S3/R2 storage registry)
// -----------------------------------------------------------------------------
export const storageBuckets = pgTable("storage_buckets", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  name: text("name").notNull(), // e.g. "Primary Neon S3", "Cloudflare R2 Media"
  slug: text("slug").notNull().unique(), // e.g. "neon-primary", "r2-audio"
  notes: text("notes"), // Admin understanding/note field
  provider: text("provider").default("s3_compatible").notNull(), // 's3_compatible' | 'aws' | 'cloudflare_r2' | 'minio'

  // Storage connection credentials (kept safe on server)
  endpoint: text("endpoint").notNull(),
  bucketName: text("bucket_name").notNull(),
  region: text("region").default("auto").notNull(),
  accessKeyId: text("access_key_id").notNull(),
  secretAccessKey: text("secret_access_key").notNull(),

  // Public CDN or Direct Delivery Base URL (e.g. "https://cdn.sabbirmms.com")
  publicBaseUrl: text("public_base_url"),

  // Status & Quotas
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  maxCapacityGb: integer("max_capacity_gb").default(5).notNull(),
  usedBytes: bigint("used_bytes", { mode: "number" }).default(0).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// -----------------------------------------------------------------------------
// 3. API KEYS TABLE (Dynamic multi-app management & key rotation)
// -----------------------------------------------------------------------------
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    appName: text("app_name").notNull(),
    appId: text("app_id").notNull().unique(),
    secretKey: text("secret_key").notNull().unique(),
    isActive: boolean("is_active").default(true).notNull(),

    // Storage bucket routing (Optional overrides per media type)
    defaultBucketId: uuid("default_bucket_id").references(
      () => storageBuckets.id,
      { onDelete: "set null" }
    ),
    imageBucketId: uuid("image_bucket_id").references(
      () => storageBuckets.id,
      { onDelete: "set null" }
    ),
    audioBucketId: uuid("audio_bucket_id").references(
      () => storageBuckets.id,
      { onDelete: "set null" }
    ),

    // App Check / Mobile Play Integrity Security (Optional per API key)
    enforceAppCheck: boolean("enforce_app_check").default(false).notNull(),
    firebaseProjectId: text("firebase_project_id"),
    allowedAppIds: text("allowed_app_ids"), // Comma-separated Firebase App IDs (e.g. "1:123456:android:abcd")

    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("api_keys_app_id_idx").on(table.appId),
    uniqueIndex("api_keys_secret_key_idx").on(table.secretKey),
  ]
);

// -----------------------------------------------------------------------------
// 4. MEDIA ASSETS TABLE (Universal media metadata, replacement & deduplication)
// -----------------------------------------------------------------------------
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    appId: text("app_id").notNull(),
    assetId: text("asset_id").notNull(),

    // Physical storage bucket reference
    bucketId: uuid("bucket_id").references(() => storageBuckets.id, {
      onDelete: "set null",
    }),

    title: text("title"),
    folder: text("folder").default("general").notNull(),
    storageKey: text("storage_key").notNull(),
    publicUrl: text("public_url").notNull(),
    blurHash: text("blur_hash"),
    originalSizeKb: integer("original_size_kb").default(0).notNull(),
    optimizedSizeKb: integer("optimized_size_kb").default(0).notNull(),
    width: integer("width").default(0).notNull(),
    height: integer("height").default(0).notNull(),
    mimeType: text("mime_type").default("image/webp").notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    // Composite Unique Constraint: appId + assetId guarantees deduplication & replacement
    uniqueIndex("media_assets_app_asset_unique_idx").on(
      table.appId,
      table.assetId
    ),
  ]
);

// -----------------------------------------------------------------------------
// 5. ADMIN USERS TABLE (Role-based access, whitelisted Google logins, 2FA TOTP)
// -----------------------------------------------------------------------------
export const adminUsers = pgTable("admin_users", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  role: text("role").default("admin").notNull(), // 'superadmin' | 'admin'
  totpSecret: text("totp_secret"),
  isTwoFactorEnabled: boolean("is_two_factor_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Infer types
export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;

export type StorageBucket = typeof storageBuckets.$inferSelect;
export type NewStorageBucket = typeof storageBuckets.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
