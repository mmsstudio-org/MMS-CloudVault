import * as dotenv from "dotenv";
dotenv.config({ path: "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/.env.local" });
dotenv.config();

import * as fs from "fs";
import { db } from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/db";
import {
  apiKeys,
  mediaAssets,
  storageBuckets,
} from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/db/schema";
import { eq, and } from "drizzle-orm";
import {
  actionSoftDeleteAsset,
  actionRestoreAsset,
  actionDeleteAssetPermanently,
} from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/lib/dashboard-actions";
import { invalidateApiKeyCache } from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/lib/api-cache";
import {
  testBucketConnection,
  getS3ClientForBucket,
} from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/lib/storage-pool";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

const BASE_URL = "http://localhost:3000";
const TEST_APP_ID = "qa-multi-bucket-app";
const TEST_API_KEY = "mms_sec_qa_multi_bucket_test_8899";

interface TestReport {
  name: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function recordTest(name: string, passed: boolean, details: string) {
  reports.push({ name, passed, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${name}]: ${details}`);
}

function extractStorageKey(url: string, bucket: any): string {
  if (bucket.publicBaseUrl && url.startsWith(bucket.publicBaseUrl)) {
    return url.replace(`${bucket.publicBaseUrl.replace(/\/$/, "")}/`, "");
  }
  const u = new URL(url);
  return u.pathname.replace(/^\//, "");
}

async function verifyS3ObjectExists(bucket: any, storageKey: string): Promise<boolean> {
  if (!storageKey) return false;
  const client = getS3ClientForBucket(bucket);
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket.bucketName,
        Key: storageKey,
      })
    );
    return true;
  } catch (err: any) {
    return false;
  }
}

async function curlUrlStatus(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status;
  } catch (err) {
    return 0;
  }
}

async function run() {
  console.log("==================================================================");
  console.log("🚀 STARTING AUTOMATED MULTI-BUCKET E2E VERIFICATION PIPELINE");
  console.log("Target Base URL:", BASE_URL);
  console.log("==================================================================\n");

  // ---------------------------------------------------------------------------
  // STEP 1: VERIFY DATABASE-DRIVEN STORAGE BUCKETS REGISTRY
  // ---------------------------------------------------------------------------
  console.log("--- Step 1: Storage Buckets Registry & Live Ping Verification ---");
  const buckets = await db.select().from(storageBuckets);

  if (buckets.length === 0) {
    throw new Error("No storage buckets registered in database. Run npm run db:seed first.");
  }

  const defaultBucket = buckets.find((b) => b.isDefault) || buckets[0];
  recordTest(
    "Bucket Registry Check",
    true,
    `Found ${buckets.length} bucket(s) in DB. Default bucket: '${defaultBucket.name}' (${defaultBucket.bucketName}).`
  );

  // Live Connection Ping Test
  const pingResult = await testBucketConnection(defaultBucket);
  recordTest(
    "Live S3 Connection Ping",
    pingResult.ok,
    `${pingResult.message} - Latency: ${pingResult.latencyMs}ms`
  );

  if (!pingResult.ok) {
    throw new Error(`S3 connection check failed: ${pingResult.message}`);
  }

  // ---------------------------------------------------------------------------
  // STEP 2: SETUP DUAL-ROUTING API KEY
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 2: Configure Dual-Bucket API Key ---");
  const existingKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.appId, TEST_APP_ID))
    .limit(1);

  if (existingKey.length === 0) {
    await db.insert(apiKeys).values({
      appName: "Multi-Bucket QA Test App",
      appId: TEST_APP_ID,
      secretKey: TEST_API_KEY,
      isActive: true,
      defaultBucketId: defaultBucket.id,
      imageBucketId: defaultBucket.id,
      audioBucketId: defaultBucket.id, // For this test, both route to the verified S3 vault
    });
    console.log("Created fresh API key with bucket bindings for:", TEST_APP_ID);
  } else {
    await db
      .update(apiKeys)
      .set({
        secretKey: TEST_API_KEY,
        isActive: true,
        defaultBucketId: defaultBucket.id,
        imageBucketId: defaultBucket.id,
        audioBucketId: defaultBucket.id,
      })
      .where(eq(apiKeys.appId, TEST_APP_ID));
    console.log("Updated existing API key with bucket bindings for:", TEST_APP_ID);
  }

  invalidateApiKeyCache(TEST_API_KEY);
  recordTest(
    "API Key & Storage Binding",
    true,
    `Key '${TEST_API_KEY}' bound to default bucket '${defaultBucket.name}'.`
  );

  // ---------------------------------------------------------------------------
  // STEP 3: UPLOAD IMAGE VIA API (Verifies MIME-type routing to /images/)
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 3: Upload Image V1 via API (POST /api/v1/upload) ---");
  const img1Path = "/Users/sabbirmms/Downloads/download.png";
  if (!fs.existsSync(img1Path)) {
    throw new Error(`File not found: ${img1Path}`);
  }

  const img1Buffer = fs.readFileSync(img1Path);
  const formData1 = new FormData();
  formData1.append("file", new Blob([img1Buffer], { type: "image/png" }), "download.png");
  formData1.append("asset_id", "test_banner_multibucket_1");
  formData1.append("title", "Multi-Bucket Promo V1");
  formData1.append("folder", "banners");

  const res1 = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": TEST_API_KEY },
    body: formData1,
  });

  const json1 = await res1.json();
  const url1 = json1?.data?.public_url;
  const storageKey1 = url1 ? extractStorageKey(url1, defaultBucket) : "";
  const isImageFolder = json1?.data?.public_url?.includes("/images/");
  const s3Exists1 = storageKey1 ? await verifyS3ObjectExists(defaultBucket, storageKey1) : false;

  recordTest(
    "Image Upload & Routing",
    res1.status === 200 && isImageFolder && s3Exists1,
    `Image uploaded. S3 Key Exists: ${s3Exists1}, Path has '/images/': ${isImageFolder}, URL: ${url1}`
  );

  // ---------------------------------------------------------------------------
  // STEP 4: UPLOAD AUDIO VIA SAME API KEY (Verifies MIME-type routing to /audio/)
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 4: Upload Audio V1 via Same API Key (POST /api/v1/upload) ---");
  const audio1Path = "/Users/sabbirmms/Downloads/whoosh.mp3";
  if (!fs.existsSync(audio1Path)) {
    throw new Error(`File not found: ${audio1Path}`);
  }

  const audio1Buffer = fs.readFileSync(audio1Path);
  const audioFormData1 = new FormData();
  audioFormData1.append("file", new Blob([audio1Buffer], { type: "audio/mpeg" }), "whoosh.mp3");
  audioFormData1.append("asset_id", "test_audio_multibucket_1");
  audioFormData1.append("title", "Whoosh SFX V1");
  audioFormData1.append("folder", "sfx");

  const audioRes1 = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": TEST_API_KEY },
    body: audioFormData1,
  });

  const audioJson1 = await audioRes1.json();
  const audioUrl1 = audioJson1?.data?.public_url;
  const audioStorageKey1 = audioUrl1 ? extractStorageKey(audioUrl1, defaultBucket) : "";
  const isAudioFolder = audioJson1?.data?.public_url?.includes("/audio/");
  const audioS3Exists1 = audioStorageKey1 ? await verifyS3ObjectExists(defaultBucket, audioStorageKey1) : false;

  recordTest(
    "Audio Upload & Routing (Same Key)",
    audioRes1.status === 200 && isAudioFolder && audioS3Exists1,
    `Audio uploaded. S3 Audio Exists: ${audioS3Exists1}, Path has '/audio/': ${isAudioFolder}, URL: ${audioUrl1}`
  );

  // ---------------------------------------------------------------------------
  // STEP 5: UPSERT / REPLACE IMAGE (Verifies 100% HARD DELETE of Old S3 File)
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 5: Upsert Image with Same asset_id (Hard Delete Verification) ---");
  const formData2 = new FormData();
  formData2.append("file", new Blob([img1Buffer], { type: "image/png" }), "download-v2.png");
  formData2.append("asset_id", "test_banner_multibucket_1"); // SAME assetId
  formData2.append("title", "Multi-Bucket Promo V2 (Replaced)");
  formData2.append("folder", "banners");

  const res2 = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": TEST_API_KEY },
    body: formData2,
  });

  const json2 = await res2.json();
  const url2 = json2?.data?.public_url;
  const storageKey2 = url2 ? extractStorageKey(url2, defaultBucket) : "";
  const isReplaced2 = json2?.data?.is_replaced === true;

  // Verify OLD physical file is gone from S3 and NEW file is live in S3
  const oldS3Exists = await verifyS3ObjectExists(defaultBucket, storageKey1);
  const newS3Exists = await verifyS3ObjectExists(defaultBucket, storageKey2);

  const oldFilePurged = !oldS3Exists;
  recordTest(
    "Image Upsert & Hard Delete Old S3 File",
    isReplaced2 && oldFilePurged && newS3Exists,
    `is_replaced: ${isReplaced2}. Old File in S3: ${oldS3Exists} (Purged), New File in S3: ${newS3Exists} (Live).`
  );

  // ---------------------------------------------------------------------------
  // STEP 6: UPSERT / REPLACE AUDIO (Verifies 100% HARD DELETE of Old Audio)
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 6: Upsert Audio with Same asset_id (Hard Delete Verification) ---");
  const audio2Path = "/Users/sabbirmms/Downloads/pop.mp3";
  const audio2Buffer = fs.readFileSync(audio2Path);
  const audioFormData2 = new FormData();
  audioFormData2.append("file", new Blob([audio2Buffer], { type: "audio/mpeg" }), "pop-v2.mp3");
  audioFormData2.append("asset_id", "test_audio_multibucket_1"); // SAME assetId
  audioFormData2.append("title", "Pop SFX V2 (Replaced)");
  audioFormData2.append("folder", "sfx");

  const audioRes2 = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": TEST_API_KEY },
    body: audioFormData2,
  });

  const audioJson2 = await audioRes2.json();
  const audioUrl2 = audioJson2?.data?.public_url;
  const audioStorageKey2 = audioUrl2 ? extractStorageKey(audioUrl2, defaultBucket) : "";
  const isAudioReplaced = audioJson2?.data?.is_replaced === true;

  const oldAudioExists = await verifyS3ObjectExists(defaultBucket, audioStorageKey1);
  const newAudioExists = await verifyS3ObjectExists(defaultBucket, audioStorageKey2);
  const oldAudioPurged = !oldAudioExists;

  recordTest(
    "Audio Upsert & Hard Delete Old Audio File",
    isAudioReplaced && oldAudioPurged && newAudioExists,
    `is_replaced: ${isAudioReplaced}. Old Audio in S3: ${oldAudioExists} (Purged), New Audio in S3: ${newAudioExists} (Live).`
  );

  // ---------------------------------------------------------------------------
  // STEP 7: SOFT DELETE VIA API (?soft=true)
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 7: Soft Delete Asset via API (DELETE /api/v1/assets/:id?soft=true) ---");
  const delRes1 = await fetch(
    `${BASE_URL}/api/v1/assets/test_banner_multibucket_1?soft=true`,
    {
      method: "DELETE",
      headers: { "x-api-key": TEST_API_KEY },
    }
  );
  const delJson1 = await delRes1.json();

  const [softDeletedRecord] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.appId, TEST_APP_ID),
        eq(mediaAssets.assetId, "test_banner_multibucket_1")
      )
    );

  recordTest(
    "Soft Delete to Trash",
    delRes1.status === 200 && softDeletedRecord?.isDeleted === true,
    `API message: '${delJson1?.message}'. isDeleted in DB: ${softDeletedRecord?.isDeleted}.`
  );

  // ---------------------------------------------------------------------------
  // STEP 8: RESTORE ASSET FROM TRASH
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 8: Restore Asset from Trash ---");
  const restoreOk = await actionRestoreAsset(softDeletedRecord.id);
  const [restoredRecord] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, softDeletedRecord.id));

  recordTest(
    "Restore Asset",
    restoreOk && restoredRecord?.isDeleted === false,
    `Asset restored. isDeleted in DB: ${restoredRecord?.isDeleted}.`
  );

  // ---------------------------------------------------------------------------
  // STEP 9: PERMANENT DELETE (PHYSICAL S3 DELETION + DB PURGE)
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 9: Permanent Hard Delete Asset via API ---");
  const delRes2 = await fetch(
    `${BASE_URL}/api/v1/assets/test_banner_multibucket_1`, // soft=false by default
    {
      method: "DELETE",
      headers: { "x-api-key": TEST_API_KEY },
    }
  );

  const [purgedDbRecord] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.appId, TEST_APP_ID),
        eq(mediaAssets.assetId, "test_banner_multibucket_1")
      )
    );

  const stillInS3 = await verifyS3ObjectExists(defaultBucket, storageKey2);
  const isPhysicallyErased = !stillInS3;

  recordTest(
    "Permanent S3 & DB Destruction",
    !purgedDbRecord && isPhysicallyErased,
    `Record in DB: ${Boolean(purgedDbRecord)}. S3 File Purged: ${isPhysicallyErased}.`
  );

  // Clean up audio test asset as well
  await fetch(`${BASE_URL}/api/v1/assets/test_audio_multibucket_1`, {
    method: "DELETE",
    headers: { "x-api-key": TEST_API_KEY },
  });

  // ---------------------------------------------------------------------------
  // STEP 9: FIREBASE APP CHECK / PLAY INTEGRITY SECURITY VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 9: Firebase App Check & Play Integrity Security Verification ---");
  const APPCHECK_TEST_APP_ID = "qa-appcheck-enforced-app";
  const APPCHECK_TEST_KEY = "mms_sec_qa_appcheck_test_7788";
  const APPCHECK_DEBUG_TOKEN = "qa_debug_appcheck_token_xyz999";
  process.env.DEBUG_APP_CHECK_TOKEN = APPCHECK_DEBUG_TOKEN;

  // Cleanup old app check test key if exists
  await db.delete(apiKeys).where(eq(apiKeys.appId, APPCHECK_TEST_APP_ID));

  // Insert API Key with App Check strictly enforced
  await db.insert(apiKeys).values({
    appName: "QA AppCheck Android App",
    appId: APPCHECK_TEST_APP_ID,
    secretKey: APPCHECK_TEST_KEY,
    isActive: true,
    enforceAppCheck: true,
    firebaseProjectId: "mms-studio-test-project",
  });
  invalidateApiKeyCache();

  // 9.1 Upload request WITHOUT App Check header -> Must fail with 403 Forbidden
  const formDataWithoutToken = new FormData();
  formDataWithoutToken.append("asset_id", "test_appcheck_unauthorized");
  formDataWithoutToken.append(
    "file",
    new Blob([img1Buffer], { type: "image/png" }),
    "test.png"
  );

  const resBlocked = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": APPCHECK_TEST_KEY },
    body: formDataWithoutToken,
  });

  const resBlockedJson = await resBlocked.json();
  const isCorrectlyBlocked =
    resBlocked.status === 403 &&
    resBlockedJson.error?.includes("App Check validation failed");

  recordTest(
    "App Check Block Unauthorized Client",
    isCorrectlyBlocked,
    `Status: ${resBlocked.status} (Expected 403). Error message: '${resBlockedJson.error}'`
  );

  // 9.2 Upload request WITH valid App Check token -> Must succeed with 200 OK
  const formDataWithToken = new FormData();
  formDataWithToken.append("asset_id", "test_appcheck_authorized");
  formDataWithToken.append(
    "file",
    new Blob([img1Buffer], { type: "image/png" }),
    "test.png"
  );

  const resAllowed = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: {
      "x-api-key": APPCHECK_TEST_KEY,
      "X-Firebase-AppCheck": APPCHECK_DEBUG_TOKEN,
    },
    body: formDataWithToken,
  });

  const resAllowedJson = await resAllowed.json();
  const isCorrectlyAllowed =
    resAllowed.status === 200 && resAllowedJson.success === true;

  recordTest(
    "App Check Attested Client Verification",
    isCorrectlyAllowed,
    `Status: ${resAllowed.status} (Expected 200). Success: ${resAllowedJson.success}`
  );

  // Clean up App Check test asset and test key
  if (isCorrectlyAllowed) {
    await fetch(`${BASE_URL}/api/v1/assets/test_appcheck_authorized`, {
      method: "DELETE",
      headers: {
        "x-api-key": APPCHECK_TEST_KEY,
        "X-Firebase-AppCheck": APPCHECK_DEBUG_TOKEN,
      },
    });
  }
  await db.delete(apiKeys).where(eq(apiKeys.appId, APPCHECK_TEST_APP_ID));
  invalidateApiKeyCache();

  // ---------------------------------------------------------------------------
  // STEP 10: SWAGGER SERVERS PADDING & CDN RECOVERY GUIDE CHECKS
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 10: Swagger CSS & CDN Guide Integrity Checks ---");
  const cssContent = fs.readFileSync(
    "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/styles/swagger-custom.css",
    "utf8"
  );
  const hasSchemesServerRule = cssContent.includes(".schemes-server-container");
  const hasMarginReset = cssContent.includes("margin: 0 !important;");

  recordTest(
    "Swagger UI Servers Spacing & CSS Reset",
    hasSchemesServerRule && hasMarginReset,
    `Swagger CSS contains .schemes-server-container: ${hasSchemesServerRule}, margin reset: ${hasMarginReset}`
  );

  const guideExists = fs.existsSync(
    "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/docs/CDN_AND_URL_RECOVERY_GUIDE.md"
  );
  recordTest(
    "CDN & URL Recovery Documentation",
    guideExists,
    `docs/CDN_AND_URL_RECOVERY_GUIDE.md exists and is readable: ${guideExists}`
  );

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("📊 MULTI-BUCKET E2E VERIFICATION TEST SUMMARY");
  console.log("==================================================================");

  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! Multi-Bucket Architecture & Dynamic Routing 100% OPERATIONAL!");
  } else {
    console.error(`\n⚠️ ${failed} check(s) failed. Inspect logs above.`);
    process.exit(1);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL PIPELINE FAILURE:", err);
    process.exit(1);
  });
