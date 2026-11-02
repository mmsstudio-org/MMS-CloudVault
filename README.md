# MMS CloudVault 🚀
> High-performance, serverless object storage, Sharp-powered image optimization pipeline, and secure asset delivery engine for mobile applications and web products.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=flat&logo=postgresql)](https://neon.tech/)
[![Sharp](https://img.shields.io/badge/Sharp-0.35_WebP-007ACC?style=flat)](https://sharp.pixelplumbing.com/)
[![OpenAPI](https://img.shields.io/badge/Swagger-OpenAPI_3.0-85EA2D?style=flat&logo=swagger)](http://localhost:3000/api-docs)
[![Architecture Docs](https://img.shields.io/badge/Architecture_Docs-project--infrastructure.md-00F0FF?style=flat&logo=markdown)](./project-infrastructure.md)

> 📖 **Full Engineering Specification & AI Portfolio Generator**: Read the exhaustive technical breakdown, infrastructure flowcharts, and customizable AI portfolio generation prompt in [**`project-infrastructure.md`**](./project-infrastructure.md).

---

## 🛠️ Complete Technology Stack

| Component | Framework / Tool | Purpose in Project |
| :--- | :--- | :--- |
| **Full-Stack Framework** | **Next.js 16 (App Router) + Turbopack** | High-performance Server Components, Route Handlers, Server Actions, sub-second HMR. |
| **Frontend & UI** | **React 19 + Tailwind CSS v4** | Modern Linear/Vercel styling, custom dark/light theme, Lucide icons, responsive drawer navigation. |
| **Database & ORM** | **Neon Serverless PostgreSQL + Drizzle ORM** | Type-safe schema definition, composite unique constraints (`appId`, `assetId`), schema synchronization via `db:push`. |
| **Media Transformation** | **Sharp 0.35.5 (libvips) + BlurHash** | Automated WebP conversion, dimension capping (`withoutEnlargement`), progressive blur placeholders. |
| **Object Storage** | **Cloudflare R2 + AWS S3 SDK v3** | Multi-cloud S3-compatible storage, $0 egress delivery, runtime multi-bucket routing for images & audio. |
| **Caching Engine** | **In-Memory LRU Cache (`lru-cache` v11)** | Ultra-fast (0.03ms) API key authorization with auto TTL expiration and instant invalidation. |
| **Authentication & 2FA** | **NextAuth v5 (Auth.js) + otplib + jose** | Whitelisted Google OAuth, TOTP 2FA (Google Authenticator) with HS256 signed session cookies. |
| **Mobile Attestation** | **Firebase App Check + Google Play Integrity** | Cryptographic RS256 JWKS validation against Google root certs to prevent client spoofing. |
| **API Documentation** | **OpenAPI 3.0.3 + Swagger UI + Postman 2.1** | Interactive testing sandbox at `/api-docs` and one-click Postman collection export. |

---

## 🌟 Key Capabilities & Highlights

1. **Sharp-Powered Automated Optimization Engine:**
   - Real-time aspect-ratio scaling under configured max dimensions (e.g. 2048px).
   - High-fidelity WebP format conversion.
   - Iterative progressive quality trimming ensuring files stay under the KB ceiling.
   - 10-20 character compact BlurHash placeholder generation for progressive mobile previews.

2. **Deduplication & Replacement Mechanism (Zero Bloat):**
   - Automatically tracks `(app_id, asset_id)` across any application (blogs, portfolios, avatars, e-commerce, web or mobile apps).
   - When an updated image is uploaded for an existing asset ID, the previous physical file in Cloudflare R2 / S3 / disk is deleted automatically, and the database record is updated with new CDN URLs and sizes.

3. **Zero-DB Read Delivery:**
   - Client devices fetch images directly from the high-speed CDN public URL (`https://storage.sabbirmms.com/...`).
   - Zero database calls are incurred on reading or displaying images in apps.

4. **In-Memory LRU API Key Caching (0.03ms Validation):**
   - API keys are validated from an in-memory LRU Cache with a 15-minute TTL.
   - High-throughput mobile apps upload seamlessly without database query bottlenecks.
   - Instant cache invalidation when keys are revoked or rotated in the dashboard.

5. **Strict Admin Security & Google OAuth Whitelist:**
   - Google Sign-In is strictly guarded: only emails pre-configured in the `allowed_admin_emails` whitelist are admitted.
   - Unauthorized Google accounts are rejected immediately at sign-in time with zero user creation or token generation.
   - Google Authenticator TOTP Two-Factor Authentication (2FA) with QR code setup.

6. **Automated Trash Bin & Scheduled Cron Purge:**
   - Soft-deleted assets are held for 30 days allowing instant recovery.
   - Automated garbage collection endpoint (`/api/v1/cron/cleanup-trash`) secured with `Bearer <CRON_SECRET>`.
   - One-click "Purge Trash Now" button in the Admin Dashboard.

7. **Interactive OpenAPI / Swagger Documentation:**
   - Fully documented OpenAPI 3.0 specification available at `/api/v1/openapi.json`.
   - Interactive testing UI at `/api-docs`.

8. **Universal Audio Support (MP3, WAV, OGG, M4A, AAC, FLAC):**
   - Direct audio stream delivery with zero database strain.
   - Built-in web audio player in the Admin Gallery and Uploader for instant playback.

9. **Google Play Integrity & Firebase App Check Attestation:**
   - Optional per-API-key hardware-backed mobile security policy.
   - Cryptographically verifies incoming requests against Google's public JWKS certificates (`RS256`).
   - Prevents unauthorized API usage, spoofing, and rogue client access outside your verified Android apps.

10. **Direct S3 / Neon Pre-signed Direct URL Upload (Zero 4.5MB Serverless Ceiling):**
   - Direct-to-bucket upload engine bypassing Vercel serverless request body size limits (`4.5MB`).
   - Generates 5-minute cryptographically signed S3 PUT URLs via `@aws-sdk/s3-request-presigner`.
   - Supports large audio tracks, voiceover stems, podcasts, and high-fidelity media up to 50MB+.
   - Two-step handshake: `/api/v1/upload/presigned` -> direct binary client `PUT` -> `/api/v1/upload/complete`.

11. **Gallery Bulk Selection & 2FA-Protected Bulk Operations:**
   - Multi-card selection bar with "Select All" and "Clear Selection" controls.
   - Bulk move-to-trash with safety modal and mandatory Google Authenticator 2FA / Recovery Code reverification.

12. **Safe API Key Governance & Zero-Orphan File Protection:**
   - Real-time slug auto-synchronization when typing application names.
   - In-place application name editing without altering or invalidating active secret keys.
   - Strict zero-file deletion protection: prevents deleting an API key if media assets exist under its application namespace.

13. **Creator Attribution & Context Tracking (`uploader_name` & `info`):**
   - Full attribution tracking across uploads, batch queues, database, and API endpoints.
   - Visual creator badges on gallery cards and inspect drawers for instant operational visibility.

---

## 📁 Project Architecture & File Map

```
mms-studio-storage/
├── public/
│   ├── logo.png               # MMS Studio official brand logo
│   ├── icon.png               # Favicon & app icon
│   └── uploads/               # Local storage fallback directory
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth route handlers & 2FA setup/verify
│   │   │   └── v1/
│   │   │       ├── cron/      # Automated 30-day trash cleanup cron
│   │   │       ├── openapi/   # OpenAPI 3.0 specification JSON
│   │   │       ├── assets/    # GET & DELETE universal media assets
│   │   │       └── upload/    # POST multipart media upload & optimization
│   │   ├── api-docs/          # Swagger UI Interactive Documentation
│   │   ├── dashboard/         # Protected Admin Operations Portal
│   │   │   ├── api-keys/      # Dynamic app key management & rotation
│   │   │   ├── gallery/       # Media asset gallery, QR codes & soft deletes
│   │   │   ├── settings/      # Sharp capping sliders, whitelist & Telegram bot
│   │   │   ├── trash/         # Soft-deleted assets & manual purge
│   │   │   └── upload/        # Manual web uploader with dynamic folder picker
│   │   ├── login/             # Administrator login & dev quick access
│   │   ├── privacy/           # Privacy Policy (Google verification ready)
│   │   ├── terms/             # Terms of Service
│   │   ├── globals.css        # Tailwind CSS v4 variables & dark mode
│   │   ├── layout.tsx         # Root layout with SEO meta & ThemeProvider
│   │   └── page.tsx           # High-tech Homepage & Studio links
│   ├── components/            # Client UI widgets (Sidebar, Header, Forms, etc.)
│   ├── db/
│   │   ├── index.ts           # PostgreSQL & Neon Serverless client
│   │   ├── schema.ts          # Drizzle ORM tables & relations
│   │   └── seed.ts            # Default settings and demo API key seeder
│   └── lib/
│       ├── api-cache.ts       # LRU Cache for microsecond API validation
│       ├── asset-manager.ts   # Deduplication & storage replacement
│       ├── auth.ts            # NextAuth v5 Google OAuth & whitelist check
│       ├── dashboard-actions.ts# Server Actions for metrics & operations
│       ├── image-optimizer.ts # Sharp image scaling, WebP & BlurHash
│       ├── storage.ts         # Cloudflare R2 / AWS S3 client & local fallback
│       ├── telegram.ts        # Telegram bot webhook notification dispatcher
│       ├── totp.ts            # Google Authenticator 2FA generator & verifier
│       └── trash-manager.ts   # Soft-delete, restore & garbage collector
├── drizzle.config.ts          # Drizzle Kit CLI configuration
├── .env.example               # Full template of required environment variables
└── README.md
```

---

## 🛠️ Getting Started (Local Development)

### 1. Prerequisites
- Node.js 24.x (required locally and on Vercel)
- PostgreSQL installed locally or a free [Neon](https://neon.tech/) database instance.

### 2. Installation
```bash
# Clone the repository and enter the directory
cd mms-studio-storage

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your credentials:
```env
DATABASE_URL="postgresql://sabbirmms@localhost:5432/mms_studio_storage"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-random-secret"

# Initial root superadmin (allowed to login even if DB is empty)
INITIAL_SUPERADMIN_EMAIL="mr.sabbirmms@gmail.com"
# Local development quick access passcode
DEV_ADMIN_PASSCODE="admin123"

# Storage credentials (leave blank in local dev for automatic public/uploads fallback)
STORAGE_ENDPOINT=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_BUCKET_NAME="mms-studio-storage"
STORAGE_PUBLIC_URL=""

# Google Cloud OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Scheduled Automation Secret
CRON_SECRET="your_secure_cron_secret"
```

### 4. Google Cloud Console OAuth 2.0 Setup (Callback URL)
In your [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials):
1. Create or select an **OAuth 2.0 Client ID** (Application type: **Web application**).
2. **Authorized JavaScript origins:**
   - Local: `http://localhost:3000`
   - Production: `https://cloud.sabbirmms.com`
3. **Authorized redirect URIs (Callback URL):**
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://cloud.sabbirmms.com/api/auth/callback/google`
4. Copy the generated `Client ID` and `Client Secret` into your `.env.local`.

### 5. Database Setup, Fresh Push & Reset Commands

> **Note on Prisma:** This project uses **Drizzle ORM** (TypeScript-native). Unlike Prisma, there is **NO `prisma generate`** command needed! Drizzle infers all types and client structures directly from `src/db/schema.ts` without intermediate code generation.

#### Complete Database Reset & Fresh Push (1-Click Recommended)
To completely wipe previous tables, push fresh schema, and seed default settings & superadmin:
```bash
npm run db:fresh
```

#### Individual Database Commands:
- **Fresh Schema Push (Without dropping tables):**
  ```bash
  npm run db:push
  ```
- **Seed Initial Data (Admin, site settings, demo API key):**
  ```bash
  npm run db:seed
  ```
- **Reset/Drop Database Schema:**
  ```bash
  npm run db:reset
  ```
- **Launch Visual Database Studio (Drizzle Studio):**
  ```bash
  npm run db:studio
  ```

---

### 6. Postman & Swagger OpenAPI Integration
- **Interactive Swagger UI:** Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for the redesigned dark-mode developer playground.
- **Export to Postman (v2.1):** 
  - Download the official Postman Collection via [http://localhost:3000/api/v1/postman.json?download=1](http://localhost:3000/api/v1/postman.json?download=1) or click **"Export to Postman"** on `/api-docs`.
  - Import the downloaded `.json` file into Postman desktop or web.
  - Or use **Import > Link** in Postman and paste: `http://localhost:3000/api/v1/openapi.json`.
  - Set the `apiKey` variable in the Postman Collection and test immediately.

---

### 7. Launch the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the homepage or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to log in.

### 8. Local Admin Login Credentials (Development)
When developing locally before configuring Google OAuth, click **"Developer / Local Quick Access"** on `/login`:
- **Email:** `mr.sabbirmms@gmail.com`
- **Passcode:** `admin123`
*(Note: This dev credential provider is strictly disabled in production for enterprise security).*

---

## 📡 REST API Reference

### 1. Upload & Optimize Asset
`POST /api/v1/upload`

**Headers:**
```http
x-api-key: mms_sec_demo_golpo_ghor_2026
Content-Type: multipart/form-data
```

**Form-Data Body:**
- `file`: (Binary image: PNG, JPG, WEBP, GIF, SVG or Audio: MP3, WAV, OGG, M4A, AAC, FLAC)
- `asset_id`: `blog_hero_2026` or `audio_ep01` (Required)
- `title`: `Hero Banner / Podcast Episode 1` (Optional)
- `folder`: `banners` or `audio` (Optional, defaults to `general`)
- `uploader_name`: `Sabbir Ahmed` (Optional creator or service name)
- `info`: `Campaign hero visual` (Optional metadata or context note)

**Sample Response (200 OK):**
```json
{
  "success": true,
  "message": "Asset successfully optimized and saved",
  "data": {
    "id": "3048a5d6-f555-4abc-8f9c-1870ddc03e18",
    "app_id": "mms-portal",
    "asset_id": "blog_hero_2026",
    "title": "Hero Banner - Tech Update",
    "folder": "banners",
    "uploader_name": "Sabbir Ahmed",
    "info": "Campaign hero visual",
    "public_url": "https://storage.sabbirmms.com/apps/mms-portal/banners/blog_hero_2026-1793389679.webp",
    "blur_hash": "LEHLk~WB2yk8pyo0adR*.7kCMdnj",
    "is_replaced": false,
    "original_size_kb": 180,
    "optimized_size_kb": 32,
    "saved_size_kb": 148,
    "width": 1280,
    "height": 720,
    "mime_type": "image/webp"
  }
}
```

---

## ⚡ Direct S3/Neon Pre-signed Upload Guide (3-Step Large Media Pipeline)
For files larger than 4.5MB (e.g. 10MB to 50MB+ lossless audio, podcasts, voiceover stems), use this 3-step lifecycle to bypass Vercel serverless request limits completely:

### Step 1: Request Direct Pre-signed Upload URL
`POST /api/v1/upload/presigned`

Generates a secure, 5-minute pre-signed S3 `PUT` URL directly targeting Neon S3 or Cloudflare R2 bucket for large audio files or assets (up to 50MB+).

**Headers:**
```http
x-api-key: mms_sec_demo_golpo_ghor_2026
Content-Type: application/json
```

**JSON Body:**
```json
{
  "asset_id": "podcast_episode_42",
  "file_name": "master_audio_track.mp3",
  "mime_type": "audio/mpeg",
  "folder": "audio",
  "title": "Episode 42 Master Track",
  "uploader_name": "Sabbir / Creator Studio",
  "info": "Lossless master voiceover and SFX mix"
}
```

**Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "upload_url": "https://br-still-snow-aoeg0x94.storage.c-2.ap-southeast-1.aws.neon.tech/bucket/key?X-Amz-Signature=...",
    "public_url": "https://media.sabbirmms.com/golpo-ghor/audio/podcast_episode_42.mp3",
    "storage_key": "golpo-ghor/audio/podcast_episode_42.mp3",
    "bucket_id": "a93e3d12-4211-4f1a-b31c-8f192b10901e",
    "expires_in_seconds": 300,
    "instructions": {
      "method": "PUT",
      "required_header": "Content-Type: audio/mpeg",
      "next_step": "POST to /api/v1/upload/complete after PUT succeeds"
    }
  }
}
```

---

### Step 2: Upload Binary Media Directly to S3 / Neon Pre-signed URL (HTTP PUT)
`PUT <upload_url>`

Execute an HTTP `PUT` request directly to the signed URL obtained in Step 1. The binary file stream is sent directly to the object storage bucket with zero Next.js server buffering and zero Vercel 4.5MB payload limitations.

> ⚠️ **Critical Requirement**: The `Content-Type` header MUST match the exact `mime_type` specified in Step 1 (e.g., `audio/mpeg` or `image/webp`).

#### Method A: cURL (Terminal / Shell)
```bash
curl -X PUT "<upload_url>" \
  -H "Content-Type: audio/mpeg" \
  --data-binary "@/path/to/your/audio_file.mp3"
```
*Note: Successful upload returns HTTP `200 OK` with an empty response body from S3/Neon.*

#### Method B: JavaScript / Frontend (React / Next.js / Web)
```javascript
// 1. Take upload_url from Step 1 response
const { upload_url, storage_key, public_url, bucket_id } = step1Data;
const file = fileInputElement.files[0];

// 2. Direct binary PUT to S3
const s3Res = await fetch(upload_url, {
  method: "PUT",
  headers: {
    "Content-Type": file.type, // e.g. "audio/mpeg"
  },
  body: file, // Raw File / Blob object
});

if (s3Res.ok) {
  // Proceed to Step 3 (POST /api/v1/upload/complete)
  console.log("File uploaded directly to S3! Now completing registration...");
}
```

#### Method C: Postman
1. **Method:** `PUT`
2. **URL:** Paste the full `upload_url` from Step 1.
3. **Headers:** Add `Content-Type: audio/mpeg`.
4. **Body:** Select **`binary`** (not form-data or raw), then browse and select your file.
5. **Send:** Returns status `200 OK`.

#### Method D: Python (`requests`)
```python
import requests

with open("podcast_audio.mp3", "rb") as f:
    headers = {"Content-Type": "audio/mpeg"}
    res = requests.put(upload_url, data=f, headers=headers)
    assert res.status_code == 200, "S3 upload failed!"
```

---

### Step 3: Complete Direct Pre-signed Upload (Confirm & Save in DB)
`POST /api/v1/upload/complete`

Called by the client immediately after successfully completing the direct HTTP `PUT` to the pre-signed S3 URL. Persists metadata in Neon DB, checks for previous asset deduplication, and emits real-time Telegram notification.

**Headers:**
```http
x-api-key: mms_sec_demo_golpo_ghor_2026
Content-Type: application/json
```

**JSON Body:**
```json
{
  "asset_id": "podcast_episode_42",
  "storage_key": "golpo-ghor/audio/podcast_episode_42.mp3",
  "public_url": "https://media.sabbirmms.com/golpo-ghor/audio/podcast_episode_42.mp3",
  "bucket_id": "a93e3d12-4211-4f1a-b31c-8f192b10901e",
  "folder": "audio",
  "title": "Episode 42 Master Track",
  "uploader_name": "Sabbir / Creator Studio",
  "info": "Lossless master voiceover and SFX mix",
  "mime_type": "audio/mpeg",
  "file_size_kb": 18450
}
```

**Sample Response (200 OK):**
```json
{
  "success": true,
  "message": "Direct media asset upload registered and confirmed in database.",
  "data": {
    "id": "e21b8f5a-c9d3-4819-a9a3-5c219f8e4321",
    "app_id": "golpo-ghor",
    "asset_id": "podcast_episode_42",
    "title": "Episode 42 Master Track",
    "folder": "audio",
    "uploader_name": "Sabbir / Creator Studio",
    "info": "Lossless master voiceover and SFX mix",
    "public_url": "https://media.sabbirmms.com/golpo-ghor/audio/podcast_episode_42.mp3",
    "is_replaced": false
  }
}
```

### 4. Retrieve Media Asset
`GET /api/v1/assets/{asset_id}`

**Headers:**
```http
x-api-key: mms_sec_demo_2026
```

### 5. Soft Delete Media Asset (Move to Trash)
`DELETE /api/v1/assets/{asset_id}`

**Headers:**
```http
x-api-key: mms_sec_demo_2026
```

### 6. Scheduled Trash Cleanup (Cron)
`POST /api/v1/cron/cleanup-trash`

**Headers:**
```http
Authorization: Bearer <CRON_SECRET>
```

---

## 🌐 Custom CDN Subdomains & Zero-Data-Loss URL Recovery
MMS CloudVault implements an atomic dual-identifier architecture: every asset is stored with its immutable S3 `storage_key` and physical `bucket_id`. The configured `cdn_url` acts as a delivery projection and never mutates the underlying storage path.

- **Zero-Data-Loss Guarantee**: Even if an unlinked, mistyped, or broken CDN subdomain is assigned to a bucket, **all files remain 100% safe in S3/R2**.
- **1-Click Emergency Fallback**: Clearing or removing the CDN URL in "Bucket Management" instantly falls back to direct S3 / R2 origin URLs across the entire platform.
- **Detailed Guide**: See the complete step-by-step setup for Cloudflare R2 Custom Domains, Cloudflare Worker Edge Proxies, and Neon DB recovery queries in [docs/CDN_AND_URL_RECOVERY_GUIDE.md](docs/CDN_AND_URL_RECOVERY_GUIDE.md).

---

## 🛡️ Mobile Security: Google Play Integrity & Firebase App Check
For Android and mobile applications, MMS CloudVault offers bulletproof attestation:

- **Header**: Requests send `X-Firebase-AppCheck: <JWT>` alongside `x-api-key`.
- **Public Key Verification**: Server cryptographically verifies the token using Google's public JWKS endpoint (`https://firebaseappcheck.googleapis.com/v1/jwks`) with RS256 algorithm.
- **Audience & App ID Whitelist**: Enforces that requests originate strictly from your Firebase Project and authorized mobile app IDs.
- **Multi-Device Local Testing**: Supports dynamic debug tokens so you can develop on multiple Macs, laptops, or physical test devices without restarting the server.
- **Toggleable Per Key**: Web clients, server scripts, and mobile apps can coexist seamlessly.
- **Complete Step-by-Step Manual**: See [docs/FIREBASE_APP_CHECK_GUIDE.md](docs/FIREBASE_APP_CHECK_GUIDE.md) for how to collect your Firebase Project ID, App IDs, and device debug tokens, with Kotlin and Flutter integration code.

---

## 🔒 Security & Brand Verification
- **Google OAuth Brand Ready:** Includes compliant `/privacy` and `/terms` pages, meta tags, and verified domain links to [studio.sabbirmms.com](https://studio.sabbirmms.com).
- **Strict Email Whitelist:** All Google OAuth logins check the `site_settings.allowed_admin_emails` table before session issuance.

---

© 2026 [MMS Studio](https://studio.sabbirmms.com). All rights reserved.

### Reliable uploads and Telegram delivery

Run `npm run db:push` before running this version to synchronize the database with
`src/db/schema.ts`. `AUTH_SECRET` or `NEXTAUTH_SECRET` must be set.
Direct upload clients must copy `data.upload_token` from the presigned response
into `/api/v1/upload/complete`, together with the exact returned object metadata.
Upload tokens expire after 30 minutes; presigned PUT URLs retain their shorter
expiry. Existing direct-upload clients must be updated alongside the server.
The Postman collection captures these values automatically.

Asset identity is the exact, case-sensitive `(app_id, asset_id)` pair. Folder is
metadata, never part of replacement matching. The server does not add an app
prefix to `asset_id`; API clients and dashboard must supply the same asset ID.
Object paths already include the app namespace and a unique upload identifier.

Telegram events commit with uploaded media. Delivery history and manual retry
of failed events are available in Dashboard Settings. A sent message ID confirms
Telegram accepted it, not that a phone displayed a notification. Temporary
failures retry with backoff, including Telegram's retry-after delay. After 10
attempts the event stays failed until manually retried. A crash after Telegram
accepts a message but before its DB acknowledgment may produce a duplicate;
Telegram sendMessage does not provide an idempotency key.

The included Vercel cron runs every minute (requires a plan supporting that
frequency). Set `CRON_SECRET`; Vercel supplies it as Bearer authorization.
For other hosts, schedule an authenticated GET or POST to
`/api/v1/cron/telegram` every minute. Keep this worker enabled so events left
pending during bursts or downtime are delivered. No bot credentials are stored
in the outbox. Local integration tests use only the isolated database:

```sh
DATABASE_URL=postgresql://localhost:5432/mms_upload_reliability_test npx tsx --test tests/upload-reliability.test.ts
```

Use `npm run db:push` to synchronize the schema using `DATABASE_URL` from `.env.local`. For a fresh local test database, create
`mms_upload_reliability_test`, then run `drizzle-kit push` with that DATABASE_URL.
`DATABASE_URL=postgresql://localhost:5432/mms_upload_reliability_test npm run test:uploads`
runs the database/S3-transport/Telegram integration checks. To run browser checks,
start `next dev --port 3105` against that same isolated database with AUTH_URL,
NEXTAUTH_URL and NEXT_PUBLIC_APP_URL set to `http://localhost:3105`, and a test
AUTH_SECRET. Then run `npm run test:upload-form` (Google Chrome required).
Run browser and database tests sequentially; database tests reset test fixtures.

### Shared upload API

Android, web portals, and other clients use the same `/api/v1/upload` and
`/api/v1/assets/{asset_id}` endpoints with `x-api-key`. Each key controls App Check
enforcement in the existing dashboard: disabled accepts the API key alone;
enabled also requires a valid `X-Firebase-AppCheck` token (or an explicitly
configured development token). Firebase JWT verification checks signature, expiry,
issuer, numeric project number, audience, and allowed app IDs. No Firebase Admin
service account or extra endpoint is required.

Asset identity is App ID + Asset ID, independent of folder. Replacement keeps that
identity; delayed cleanup supplies `expected_url` so it cannot delete a newer image.
The existing nullable `uploader_uid` database column is unused and retained to avoid
a destructive schema change. No migration or database push is needed.
