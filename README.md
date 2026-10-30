# MMS CloudVault 🚀
> High-performance, serverless object storage, Sharp-powered image optimization pipeline, and secure asset delivery engine for mobile applications and web products.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=flat&logo=postgresql)](https://neon.tech/)
[![Sharp](https://img.shields.io/badge/Sharp-0.35_WebP-007ACC?style=flat)](https://sharp.pixelplumbing.com/)
[![OpenAPI](https://img.shields.io/badge/Swagger-OpenAPI_3.0-85EA2D?style=flat&logo=swagger)](http://localhost:3000/api-docs)

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
- Node.js 20+ (Node.js 24 recommended)
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

### 2. Retrieve Media Asset
`GET /api/v1/assets/{asset_id}`

**Headers:**
```http
x-api-key: mms_sec_demo_2026
```

### 3. Soft Delete Media Asset (Move to Trash)
`DELETE /api/v1/assets/{asset_id}`

**Headers:**
```http
x-api-key: mms_sec_demo_2026
```

### 4. Scheduled Trash Cleanup (Cron)
`POST /api/v1/cron/cleanup-trash`

**Headers:**
```http
Authorization: Bearer <CRON_SECRET>
```

---

## 🔒 Security & Brand Verification
- **Google OAuth Brand Ready:** Includes compliant `/privacy` and `/terms` pages, meta tags, and verified domain links to [studio.sabbirmms.com](https://studio.sabbirmms.com).
- **Strict Email Whitelist:** All Google OAuth logins check the `site_settings.allowed_admin_emails` table before session issuance.

---

© 2026 [MMS Studio](https://studio.sabbirmms.com). All rights reserved.
