import * as dotenv from "dotenv";
dotenv.config({ path: "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/.env.local" });
dotenv.config();

import * as fs from "fs";
import { db } from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/db";
import { apiKeys, mediaAssets } from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/db/schema";
import { eq, and } from "drizzle-orm";
import {
  actionSoftDeleteAsset,
  actionRestoreAsset,
  actionDeleteAssetPermanently,
} from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/lib/dashboard-actions";
import { invalidateApiKeyCache } from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/lib/api-cache";
import { processAndSaveAsset } from "/Volumes/AntiqueAPFS/01_Workspace/01_Web/mms-studio-storage/src/lib/asset-manager";

const BASE_URL = "http://localhost:3000";
const TEST_APP_ID = "qa-test-app";
const TEST_API_KEY = "mms_sec_qa_live_test_key_8899";

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

async function curlUrlStatus(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status;
  } catch (err) {
    console.error("curlUrlStatus error:", err);
    return 0;
  }
}

async function run() {
  console.log("==================================================================");
  console.log("🚀 STARTING AUTOMATED END-TO-END VERIFICATION PIPELINE");
  console.log("Target API Base:", BASE_URL);
  console.log("==================================================================\n");

  // ---------------------------------------------------------------------------
  // STEP 1: API KEY INITIALIZATION
  // ---------------------------------------------------------------------------
  console.log("--- Step 1: Ensure API Key Exists in Database ---");
  const existingKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.appId, TEST_APP_ID))
    .limit(1);

  if (existingKey.length === 0) {
    await db.insert(apiKeys).values({
      appName: "Automated QA Test App",
      appId: TEST_APP_ID,
      secretKey: TEST_API_KEY,
      isActive: true,
    });
    console.log("Created fresh API key for app:", TEST_APP_ID);
  } else {
    await db
      .update(apiKeys)
      .set({ secretKey: TEST_API_KEY, isActive: true })
      .where(eq(apiKeys.appId, TEST_APP_ID));
    console.log("Updated existing API key for app:", TEST_APP_ID);
  }
  invalidateApiKeyCache(TEST_API_KEY);
  recordTest("API Key Setup", true, `App ID '${TEST_APP_ID}' ready with secret key '${TEST_API_KEY}'.`);

  // ---------------------------------------------------------------------------
  // STEP 2: TEST IMAGE UPLOAD V1
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 2: Upload Image V1 via API (POST /api/v1/upload) ---");
  const img1Path = "/Users/sabbirmms/Downloads/download.png";
  if (!fs.existsSync(img1Path)) {
    throw new Error(`File not found: ${img1Path}`);
  }

  const img1Buffer = fs.readFileSync(img1Path);
  const formData1 = new FormData();
  formData1.append("file", new Blob([img1Buffer], { type: "image/png" }), "download.png");
  formData1.append("asset_id", "test_banner_promo_1");
  formData1.append("title", "Banner Promo V1");
  formData1.append("folder", "banners");

  const res1 = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": TEST_API_KEY },
    body: formData1,
  });

  const data1 = await res1.json();
  if (res1.status !== 200 || !data1.success) {
    recordTest("Image Upload V1", false, `API returned status ${res1.status}: ${JSON.stringify(data1)}`);
    return;
  }

  const img1Url = data1.data.public_url;
  const img1StorageKey = data1.data.storage_key || "";
  console.log("Image 1 Public URL:", img1Url);

  const status1 = await curlUrlStatus(img1Url);
  const isImg1Live = status1 === 200;
  recordTest(
    "Image Upload V1",
    isImg1Live,
    `Image 1 uploaded successfully to S3 storage. HTTP status on public URL: ${status1} (WebP optimized, size: ${data1.data.optimized_size_kb} KB)`
  );

  // ---------------------------------------------------------------------------
  // STEP 3: TEST IMAGE UPSERT / DEDUPLICATION (UPLOAD V2 WITH SAME ASSET ID)
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 3: Upload Image V2 with Same Asset ID (Upsert & Replace) ---");
  const img2Path = "/Users/sabbirmms/Downloads/120826117.png";
  if (!fs.existsSync(img2Path)) {
    throw new Error(`File not found: ${img2Path}`);
  }

  const img2Buffer = fs.readFileSync(img2Path);
  const formData2 = new FormData();
  formData2.append("file", new Blob([img2Buffer], { type: "image/png" }), "120826117.png");
  formData2.append("asset_id", "test_banner_promo_1"); // SAME ID!
  formData2.append("title", "Banner Promo V2 - Replaced");
  formData2.append("folder", "banners");

  const res2 = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": TEST_API_KEY },
    body: formData2,
  });

  const data2 = await res2.json();
  if (res2.status !== 200 || !data2.success) {
    recordTest("Image Upsert V2", false, `API returned status ${res2.status}: ${JSON.stringify(data2)}`);
    return;
  }

  const img2Url = data2.data.public_url;
  console.log("Image 2 New Public URL:", img2Url);
  console.log("is_replaced flag:", data2.data.is_replaced);

  const status2New = await curlUrlStatus(img2Url);
  const status1Old = await curlUrlStatus(img1Url);

  console.log(`Verification: New Image Status = ${status2New}, Old Image Status = ${status1Old}`);

  const upsertPassed =
    data2.data.is_replaced === true &&
    status2New === 200 &&
    status1Old === 404;

  recordTest(
    "Image Upsert & Storage Replacement",
    upsertPassed,
    `New image active (${status2New} OK), Old image purged from S3 storage (${status1Old} 404 Not Found), is_replaced: ${data2.data.is_replaced}`
  );

  // Verify DB count for this asset ID
  const dbImageRecords = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.appId, TEST_APP_ID), eq(mediaAssets.assetId, "test_banner_promo_1")));

  recordTest(
    "Image DB Deduplication",
    dbImageRecords.length === 1,
    `Database holds exactly 1 deduplicated record (count: ${dbImageRecords.length})`
  );

  // ---------------------------------------------------------------------------
  // STEP 4: TEST AUDIO MP3 UPLOAD V1
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 4: Upload Audio MP3 V1 via API (POST /api/v1/upload) ---");
  const audio1Path = "/Users/sabbirmms/Downloads/pop.mp3";
  if (!fs.existsSync(audio1Path)) {
    throw new Error(`Audio file not found: ${audio1Path}`);
  }

  const audio1Buffer = fs.readFileSync(audio1Path);
  const audioFormData1 = new FormData();
  audioFormData1.append("file", new Blob([audio1Buffer], { type: "audio/mpeg" }), "pop.mp3");
  audioFormData1.append("asset_id", "ui_sound_notification_01");
  audioFormData1.append("title", "Pop Notification Sound");
  audioFormData1.append("folder", "audio");

  const audioRes1 = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": TEST_API_KEY },
    body: audioFormData1,
  });

  const audioData1 = await audioRes1.json();
  if (audioRes1.status !== 200 || !audioData1.success) {
    recordTest("Audio Upload V1", false, `API returned status ${audioRes1.status}: ${JSON.stringify(audioData1)}`);
    return;
  }

  const audio1Url = audioData1.data.public_url;
  console.log("Audio 1 Public URL:", audio1Url);

  const audioStatus1 = await curlUrlStatus(audio1Url);
  recordTest(
    "Audio Upload V1",
    audioStatus1 === 200 && audioData1.data.mime_type.startsWith("audio/"),
    `Audio MP3 uploaded directly to S3. Public URL status: ${audioStatus1} (MIME: ${audioData1.data.mime_type}, size: ${audioData1.data.optimized_size_kb} KB)`
  );

  // ---------------------------------------------------------------------------
  // STEP 5: TEST AUDIO MP3 UPSERT / REPLACEMENT (UPLOAD V2 WITH SAME ASSET ID)
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 5: Upload Audio MP3 V2 with Same Asset ID (Upsert & Replace) ---");
  const audio2Path = "/Users/sabbirmms/Downloads/whoosh.mp3";
  if (!fs.existsSync(audio2Path)) {
    throw new Error(`Audio file not found: ${audio2Path}`);
  }

  const audio2Buffer = fs.readFileSync(audio2Path);
  const audioFormData2 = new FormData();
  audioFormData2.append("file", new Blob([audio2Buffer], { type: "audio/mpeg" }), "whoosh.mp3");
  audioFormData2.append("asset_id", "ui_sound_notification_01"); // SAME ID!
  audioFormData2.append("title", "Whoosh Sound V2");
  audioFormData2.append("folder", "audio");

  const audioRes2 = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: "POST",
    headers: { "x-api-key": TEST_API_KEY },
    body: audioFormData2,
  });

  const audioData2 = await audioRes2.json();
  if (audioRes2.status !== 200 || !audioData2.success) {
    recordTest("Audio Upsert V2", false, `API returned status ${audioRes2.status}: ${JSON.stringify(audioData2)}`);
    return;
  }

  const audio2Url = audioData2.data.public_url;
  console.log("Audio 2 Public URL:", audio2Url);

  const audioStatus2New = await curlUrlStatus(audio2Url);
  const audioStatus1Old = await curlUrlStatus(audio1Url);

  const audioUpsertPassed =
    audioData2.data.is_replaced === true &&
    audioStatus2New === 200 &&
    audioStatus1Old === 404;

  recordTest(
    "Audio Upsert & Storage Replacement",
    audioUpsertPassed,
    `New audio active (${audioStatus2New} OK), Old audio purged from S3 storage (${audioStatus1Old} 404 Not Found), is_replaced: ${audioData2.data.is_replaced}`
  );

  // ---------------------------------------------------------------------------
  // STEP 6: TEST DASHBOARD UPLOAD & SOFT DELETE / RESTORE / PERMANENT DELETE
  // ---------------------------------------------------------------------------
  console.log("\n--- Step 6: Test Dashboard Upload & Soft Delete / Restore / Permanent Delete ---");
  const dashImgPath = "/Users/sabbirmms/Downloads/download (1).png";
  const dashBuffer = fs.readFileSync(dashImgPath);

  const dashResult = await processAndSaveAsset({
    appId: TEST_APP_ID,
    assetId: "dashboard_test_item_99",
    title: "Dashboard Test Photo",
    folder: "general",
    buffer: dashBuffer,
    appName: "Automated QA Test App",
    fileName: "download (1).png",
    mimeType: "image/png",
  });

  const dashAsset = dashResult.asset;
  const dashUrl = dashAsset.publicUrl;
  console.log("Dashboard Asset Uploaded ID:", dashAsset.id, "Public URL:", dashUrl);

  const dashLiveStatus = await curlUrlStatus(dashUrl);
  recordTest(
    "Dashboard Upload Pipeline",
    dashLiveStatus === 200,
    `Asset created via Dashboard pipeline and live on S3 (status ${dashLiveStatus})`
  );

  // Test 6A: Soft Delete (Move to Trash)
  console.log("Executing Soft Delete on:", dashAsset.id);
  await actionSoftDeleteAsset(dashAsset.id);

  const [softRecord] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, dashAsset.id));

  const softS3Status = await curlUrlStatus(dashUrl);
  const softPassed = softRecord?.isDeleted === true && softS3Status === 200;

  recordTest(
    "Dashboard Soft Delete (Move to Trash)",
    softPassed,
    `Asset marked isDeleted: true in DB; physical file safely preserved in S3 for 30-day recovery (status ${softS3Status} OK)`
  );

  // Test 6B: Restore Asset from Trash
  console.log("Executing Restore on:", dashAsset.id);
  await actionRestoreAsset(dashAsset.id);

  const [restoredRecord] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, dashAsset.id));

  const restorePassed = restoredRecord?.isDeleted === false && restoredRecord.deletedAt === null;
  recordTest(
    "Dashboard Restore Asset",
    restorePassed,
    `Asset restored back to active gallery status (isDeleted: false, deletedAt: null)`
  );

  // Test 6C: Permanent Delete (Erase from Cloud Storage & DB)
  console.log("Executing Permanent Delete on:", dashAsset.id);
  const permRes = await actionDeleteAssetPermanently(dashAsset.id);

  const [permRecord] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, dashAsset.id));

  const permS3Status = await curlUrlStatus(dashUrl);
  const permPassed = permRes.success && !permRecord && permS3Status === 404;

  recordTest(
    "Dashboard Permanent Delete",
    permPassed,
    `Asset permanently erased: Cloud Storage status is ${permS3Status} (404 Not Found), DB record deleted: ${!permRecord}`
  );

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("📊 FINAL VERIFICATION PIPELINE RESULTS");
  console.log("==================================================================");

  let allPassed = true;
  for (const r of reports) {
    const icon = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${icon} | ${r.name.padEnd(35)} | ${r.details}`);
    if (!r.passed) allPassed = false;
  }

  console.log("==================================================================");
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED WITH 100% SUCCESS!");
  } else {
    console.log("⚠️ SOME TESTS FAILED! INSPECT LOGS ABOVE.");
  }
  console.log("==================================================================\n");

  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error("FATAL TEST RUNNER ERROR:", err);
  process.exit(1);
});
