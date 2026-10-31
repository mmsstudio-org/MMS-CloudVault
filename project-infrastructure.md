# MMS CloudVault — Complete Technical Infrastructure & Architecture Specification

---

> ### 🤖 AI PORTFOLIO GENERATION PROMPT (COPY & PASTE READY)
> 
> *Copy the prompt box below along with this entire document and paste it into ChatGPT, Claude, or any LLM to generate an executive-level portfolio project case study, resume bullet points, or client pitch.*
>
> ```markdown
> [PROMPT FOR AI]
> You are an elite Principal Cloud & Systems Software Architect. 
> Below is the complete technical architecture and infrastructure specification of "MMS CloudVault" — built by Sabbir MMS (MMS Studio).
> 
> Carefully read this entire technical document and generate a world-class Portfolio Project Case Study and Resume Summary.
> 
> STRICT COMPLIANCE & PRIVACY RULES:
> 1. NEVER mention specific internal hosting vendors like "Neon Database" or internal database hostnames in the generated output. 
> 2. Instead, use industry-standard enterprise terminology:
>    - Database: "Serverless High-Availability PostgreSQL with Drizzle ORM & Composite Indexing"
>    - Storage: "Multi-Cloud S3-Compatible Object Storage & Cloudflare R2 ($0 Egress) with dynamic runtime bucket routing"
>    - Pipeline: "Sharp WebP Media Compression & Progressive BlurHash Generation Engine"
> 3. Structure the generated case study into:
>    - Project Title & Hook (High-Impact One-Liner)
>    - Executive Problem Statement & Engineering Challenges
>    - Core Architectural Innovations (Media Pipeline, 0.03ms LRU Caching, Deduplication, Multi-Cloud Routing)
>    - Enterprise Security & Hardware-Backed Mobile Integrity (TOTP 2FA, Firebase App Check / Play Integrity)
>    - Complete Tech Stack Summary (Formatted as clean markdown tables)
>    - Measurable Performance Metrics & Scalability Impact
>    - Key Takeaway / Architect Quote
> 
> Here is the complete technical infrastructure document:
> ```

---

## 1. Executive Summary & Core Mission

**MMS CloudVault** is an enterprise-grade, high-performance media infrastructure, automated asset optimization pipeline, and multi-cloud object storage management platform. 

It was engineered from first principles to solve three massive challenges faced by modern web and mobile applications:
1. **Network Payload Bloat & Slow Mobile First Contentful Paint (FCP)**: Unoptimized multi-megabyte JPEG/PNG images destroying mobile app performance and user bandwidth.
2. **Storage Redundancy & Astronomical Bandwidth Bills**: Duplicate media uploads orphaned across cloud buckets and predatory cloud egress bandwidth fees.
3. **Rogue Client Access & API Key Leakage**: Native mobile apps and third-party integrations vulnerable to scraping, man-in-the-middle attacks, and unauthorized upload abuse.

CloudVault provides a unified, zero-read-overhead REST API alongside a state-of-the-art administrative control portal that automates image resizing, WebP conversion, progressive BlurHash generation, deduplication, and multi-cloud storage routing across S3-compatible providers.

---

## 2. Complete Technical Stack Breakdown

| Layer | Technologies Used | Key Responsibilities & Capabilities |
| :--- | :--- | :--- |
| **Framework & Engine** | **Next.js 16 (App Router)** | Full-stack server actions, route handlers, Turbopack compiler, zero-latency streaming. |
| **UI & Styling** | **React 19, Tailwind CSS v4, Lucide** | Modern Linear/Vercel-inspired dark/light theme, GPU-accelerated 60fps spring transitions. |
| **Database & ORM** | **Serverless PostgreSQL, Drizzle ORM** | ACID-compliant transactional persistence, schema migrations, composite indexes (`app_id` + `asset_id`). |
| **Media Engine** | **Sharp 0.35, BlurHash** | Multi-threaded native libvips image compression, auto WebP scaling, progressive mobile BlurHash strings. |
| **Object Storage** | **AWS S3 SDK v3, Cloudflare R2, S3 Pre-signer** | Multi-cloud storage engine, dynamic per-app bucket routing, $0 egress architecture, direct pre-signed PUT URLs. |
| **Caching Layer** | **In-Memory LRU Cache (`lru-cache` v11)** | Microsecond API key validation (0.03ms), automatic TTL expiration, instant cache eviction. |
| **Authentication** | **NextAuth v5 (Auth.js), Google OAuth** | Strict email whitelist gatekeeping, session JWTs, zero unauthorized account creation. |
| **Secondary Auth** | **TOTP 2FA (`otplib`, `qrcode`, `jose`)** | Hardware/mobile Google Authenticator challenge, cryptographically signed HS256 cookies. |
| **Mobile Attestation** | **Firebase App Check, Google Play Integrity** | RS256 JWKS public key verification, hardware-backed mobile app integrity shielding. |
| **API Standards** | **OpenAPI 3.0.3, Swagger UI, Postman 2.1** | Interactive testing sandbox, live request execution, portable API collection export. |

---

## 3. High-Level Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Clients["1. Ingestion Sources"]
        Mob["Mobile Apps (Android/Flutter/iOS)"]
        Web["Web Apps & External Platforms"]
        Admin["Admin Portal Operations"]
    end

    subgraph SecurityGate["2. Security & Policy Gate"]
        KeyVal{"LRU API Key Cache\n(0.03ms lookup)"}
        AppCheck{"Firebase App Check\nPlay Integrity JWKS"}
        Whitelist{"Admin Whitelist\n& TOTP 2FA"}
    end

    subgraph Optimization["3. High-Performance Media Pipeline"]
        Sharp["Sharp Engine\n(WebP Conversion & Quality Capping)"]
        Blur["BlurHash Generator\n(32-bit Progressive Preview)"]
        Audio["Audio Pass-Through\n(MP3, WAV, AAC, M4A)"]
    end

    subgraph StorageRouter["4. Dynamic Storage Routing Engine"]
        Dedup{"Asset Deduplication\n(Delete Old Physical File)"}
        BucketRoute["Routing Engine\n(Image Bucket vs Audio Bucket)"]
        R2["Cloudflare R2\n($0 Egress Primary Vault)"]
        S3["AWS S3 / S3-Compatible\n(Secondary Cloud Vault)"]
    end

    subgraph Delivery["5. Zero-Database Read Delivery"]
        CDN["Edge CDN Delivery Network"]
        ClientRender["Client App Render with Instant BlurHash"]
    end

    Mob -->|x-api-key + x-firebase-appcheck| SecurityGate
    Web -->|x-api-key| SecurityGate
    Admin -->|NextAuth Google + TOTP| SecurityGate

    SecurityGate --> Optimization
    Optimization --> StorageRouter
    StorageRouter --> Dedup
    Dedup --> BucketRoute
    BucketRoute --> R2
    BucketRoute --> S3
    R2 --> CDN
    S3 --> CDN
    CDN --> ClientRender
```

---

## 4. Deep-Dive Subsystem Specifications

### 4.1 Sharp Image Optimization & Progressive BlurHash Pipeline
- **Zero Upscaling Guarantee (`withoutEnlargement: true`)**: Assets below the configured dimension threshold (e.g. `2048px`) are never artificially enlarged, preserving original pixels and preventing compression distortion.
- **Progressive WebP Conversion**: Incoming JPEGs, PNGs, and TIFFs are transcoded to WebP with configurable quality (default: `80%`), reducing file weights by 60% to 85% with zero human-perceivable degradation.
- **Iterative Size Capping**: If the resulting WebP exceeds the administrative file ceiling (e.g. `1024 KB`), an adaptive binary-search quality trimming loop ensures files strictly adhere to bandwidth caps.
- **Micro-BlurHash Strings**: Concurrently generates a 20-30 character string representation of the image luminance matrix. Mobile apps render this instant blurred placeholder in 0ms before the full high-res image streams from CDN.

### 4.2 Deduplication & Single-Source-of-Truth Replacement
- Every upload carries an `app_id` and unique `asset_id` (e.g. `user_avatar_102`, `blog_cover_45`).
- The database enforces a composite unique constraint: `uniqueIndex("media_assets_app_asset_unique_idx").on(table.appId, table.assetId)`.
- When an updated graphic is uploaded:
  1. The pipeline queries previous storage metadata in transactional isolation.
  2. The previous physical binary in Cloudflare R2 / S3 is deleted via `DeleteObjectCommand`.
  3. The database record is updated in-place with the new CDN URL, dimensions, and BlurHash.
  4. Zero orphaned files or ghost assets accumulate over time.

### 4.3 Multi-Cloud Dynamic Storage Routing Engine
- Supports multiple simultaneous object storage accounts (Cloudflare R2, AWS S3, MinIO, S3-Compatible).
- **Per-API-Key Dedicated Routing**: Each API key can define:
  - Default Bucket (fallback for all media)
  - Dedicated Image Bucket (e.g. high-speed Cloudflare R2 bucket)
  - Dedicated Audio Bucket (e.g. archival S3 bucket)
- **Pre-Flight Connectivity Probing**: Every bucket registration features an integrated live connection test verifying `HeadBucket` and credentials before persisting.

### 4.4 Hardware-Backed Mobile Security & Play Integrity
- Native Android applications attest their binary signature and runtime device integrity through Google Play Integrity API.
- Firebase App Check issues a signed cryptographic JWT (`RS256`).
- CloudVault fetches Google's public JWKS certificates from `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`.
- Requests lacking valid Google attestation are rejected with HTTP 401 before reaching the storage or optimization engines.

### 4.5 Dual-Stage Administrative Authentication & TOTP 2FA
- **Stage 1 (Strict Google OAuth Whitelist)**: Google OAuth sign-in is cross-referenced with database whitelist. Unauthorized emails trigger immediate `AccessDenied` with zero database record creation.
- **Stage 2 (Time-Based One-Time Password - TOTP 2FA)**:
  - Users configure Google Authenticator via dynamic QR codes (`otplib`).
  - Upon sign-in, sessions with `isTwoFactorEnabled: true` are blocked by `DashboardLayout` and redirected to `/login/verify-2fa`.
  - Passing the 6-digit challenge issues a tamper-proof HTTP-Only session cookie (`mms_2fa_session`) cryptographically signed with HS256 (`jose`).
  - When 2FA is disabled, users enter the dashboard seamlessly with zero interruption.

### 4.6 Direct S3 / Neon Pre-signed URL Pipeline (Zero-Serverless-Ceiling Direct Ingestion)
- **Problem Solved**: Standard HTTP POST uploads buffer binary streams through Next.js serverless functions, hitting Vercel's strict `4.5 MB` payload ceiling. While client-side WebP compression handles images, high-fidelity audio tracks (10MB–50MB+) fail without direct cloud storage ingestion.
- **Architectural Flow**:
  1. **Pre-signed Request (`POST /api/v1/upload/presigned`)**: Authenticates caller via API key / App Check, verifies MIME type, resolves target bucket (e.g. Neon S3 or Cloudflare R2), and calls `@aws-sdk/s3-request-presigner`'s `getSignedUrl(s3Client, putCommand, { expiresIn: 300 })`.
  2. **Direct Binary PUT**: Client uploads file bytes directly to object storage endpoint (`HTTP PUT`). Zero bandwidth, memory, or CPU consumed on the Next.js server.
  3. **Completion & Registration (`POST /api/v1/upload/complete`)**: Client passes asset metadata to server. Database checks for asset deduplication, replaces old storage keys if present, registers the new record, and fires Telegram notifications.

### 4.7 Multi-Factor Bulk Operations & Safe Key Governance
- **Gallery Multi-Card Selection**: Users can select individual assets or click "Select All" with a persistent floating action bar.
- **2FA Reverification Guard**: Deleting multiple assets in bulk requires confirming a 6-digit Google Authenticator TOTP token or single-use recovery code via `verifyUserTwoFactorChallenge()`. Unauthorized or unverified bulk delete requests are strictly blocked.
- **Safe Application Key Governance**:
  - Live slug synchronization automatically generates valid URL-safe identifiers while typing app names.
  - Safe rename action enables updating application titles without modifying or regenerating production secret keys.
  - Strict zero-orphan file deletion policy: an API key can never be deleted if media assets associated with its `app_id` exist in the database.

### 4.8 Creator Attribution & Metadata Context
- Optional `uploader_name` (e.g. creator name, automation agent, or service identifier) and `info` (notes, scene description, or campaign remarks) are indexed and stored.
- Fully rendered across web dashboard gallery badges, card overlays, metadata inspector drawers, and REST API payloads.

---

## 5. End-to-End Project Setup & Deployment Guide

### 5.1 System Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **Package Manager**: npm v10+ or pnpm
- **Database**: PostgreSQL (v15+)
- **Storage**: Cloudflare R2 API Tokens or AWS S3 IAM Credentials
- **Auth**: Google Cloud Console OAuth 2.0 Client Credentials

### 5.2 Environment Configuration (`.env.local`)
```env
# Application Host URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# NextAuth v5 Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-random-32-byte-key-here"

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Administrative Security
INITIAL_SUPERADMIN_EMAIL="mr.sabbirmms@gmail.com"
DEV_ADMIN_PASSCODE="your-secure-dev-passcode"

# Automated Garbage Collection
CRON_SECRET="your-cron-secret-token"

# Primary S3 / Cloudflare R2 Storage Vault
S3_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET_NAME="mms-cloud-vault"
S3_ACCESS_KEY_ID="your-r2-access-key-id"
S3_SECRET_ACCESS_KEY="your-r2-secret-access-key"
PUBLIC_CDN_BASE_URL="https://cdn.sabbirmms.com"
```

### 5.3 Initial Installation & Database Setup
```bash
# 1. Clone repository
git clone https://github.com/sabbirmms/mms-studio-storage.git
cd mms-studio-storage

# 2. Install dependencies
npm install

# 3. Push schema to database
npm run db:push

# 4. Seed default settings, superadmin user, and default API key
npm run db:seed

# 5. Start development server with Turbopack
npm run dev
```

### 5.4 Production Compilation & Process Management
```bash
# 1. Run strict TypeScript verification
npx tsc --noEmit

# 2. Compile optimized production build
npm run build

# 3. Start standalone production server
npm run start

# (Alternative) Run with PM2 Process Manager
pm2 start npm --name "cloudvault" -- start
pm2 save
```

### 5.5 Reverse Proxy & Cloudflare Tunnel Configuration
For seamless SSL termination and zero-port-exposure deployment:
```bash
# Cloudflare Tunnel Ingress Rule
tunnel: <TUNNEL_UUID>
credentials-file: /etc/cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: cloud.sabbirmms.com
    service: http://localhost:3000
  - service: http_status:404
```

---

## 6. Verification & Automated Testing Suite

The project includes custom automated verification scripts in `/scripts`:
- `npm run db:fresh` — Complete database reset, schema migration, and seeder execution.
- `npx tsx scripts/test-2fa-lifecycle.ts` — Cryptographic verification of TOTP secrets, tokens, tamper rejection, and HS256 signatures.
- `npx tsx scripts/run-full-verification.ts` — End-to-end integration test of file uploads, Sharp transformations, API key LRU cache, and soft deletes.

---

## 7. Author & Engineering License

- **Lead Architect & Developer**: Sabbir MMS (MMS Studio)
- **Official Portfolio**: [studio.sabbirmms.com](https://studio.sabbirmms.com)
- **Primary Channel**: MMS Studio Media Automation Systems
- **License**: Proprietary / Enterprise Private Standard
