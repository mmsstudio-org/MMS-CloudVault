# MMS CloudVault: CDN Integration & Zero-Data-Loss URL Recovery Guide

This guide provides an end-to-end blueprint for managing **Custom CDNs**, configuring **Custom Subdomains** (e.g., `cdn.yourdomain.com` or `assets.mms4fc.com`), and executing our **Zero-Data-Loss URL Recovery Plan** if a CDN domain is unlinked, misconfigured, or facing DNS issues.

---

## 1. Zero-Data-Loss Architectural Guarantee

In MMS CloudVault, **your media files and original URLs are NEVER permanently lost**, even if you enter a non-existent or broken CDN domain in the bucket settings.

### How it Works (Dual-Identifier Pattern):
Every asset uploaded to MMS CloudVault is stored with atomic decoupling between the **physical storage location** and the **delivery CDN**:

```
                              ┌──────────────────────────────────────────┐
                              │               media_assets               │
                              ├──────────────────────────────────────────┤
                              │ asset_id: "banner_promo_01"              │
                              │ storage_key: "images/202610/uuid.webp"   │  ◄── Never changes
                              │ bucket_id: "uuid-bucket-r2-01"           │  ◄── Points to physical bucket
                              └──────────────────────────────────────────┘
                                                   │
                        ┌──────────────────────────┴──────────────────────────┐
                        ▼                                                     ▼
           [Active CDN Distribution]                               [Raw Origin Fallback]
       https://cdn.yourdomain.com/...                      https://pub-xxx.r2.dev/...
       (Edge cached, fast, brand SSL)                      (100% permanent S3/R2 direct link)
```

1. **Physical Immutability (`storage_key`)**:
   - When an image or audio file is saved, the database stores the exact relative path in the S3 bucket (`storage_key`), such as `images/202610/4f2a89c1-7b01.webp`.
2. **Bucket Relationship (`bucket_id`)**:
   - The asset record references the specific `storage_buckets` row containing the actual S3 credentials, endpoint, region, and raw bucket name.
3. **CDN is a Delivery Projection, NOT a Storage Path**:
   - The `cdn_url` field on `storage_buckets` is merely a prefix template (e.g., `https://cdn.mms4fc.com`).
   - If `cdn_url` is removed, empty, or misconfigured, the file in S3/R2 is **completely untouched**.

---

## 2. Emergency URL Recovery Plan

If you configured a custom CDN subdomain (e.g., `https://cdn.mms4fc.com`), but the subdomain has not yet been linked, is showing `DNS_PROBE_FINISHED_NXDOMAIN`, or returns an SSL error, follow these immediate recovery steps:

### Recovery Method 1: Instant Dashboard Reversion (0 Downtime)
1. Open the MMS CloudVault Admin Dashboard at `/dashboard/buckets`.
2. Find the bucket associated with the broken CDN.
3. Click **"Edit Bucket"** (`⚙️`).
4. **Clear the "CDN Domain / Custom URL Prefix" input** (make it completely empty) or set it back to the raw R2 public URL (`https://pub-xxxxxxxx.r2.dev`).
5. Click **"Save Changes"**.
6. **Result**: Within 1 millisecond, all asset endpoints, public links, and dashboard previews will immediately fall back to the raw, working S3/R2 origin URL.

### Recovery Method 2: Deterministic Raw Origin Reconstruction
Even if the database CDN URL is broken, you can deterministically construct the direct, unproxied link for any asset using its `storage_key`:

- **Cloudflare R2 (Public `r2.dev` Domain)**:
  ```
  https://pub-<your-r2-subdomain>.r2.dev/<storage_key>
  ```
- **AWS S3**:
  ```
  https://<bucket-name>.s3.<region>.amazonaws.com/<storage_key>
  ```
- **MinIO / Self-Hosted S3**:
  ```
  https://<minio-host>:<port>/<bucket-name>/<storage_key>
  ```

### Recovery Method 3: Neon SQL Recovery Script
If you need to batch-reset CDN URLs directly in your Neon PostgreSQL database:

```sql
-- 1. View all active buckets and their configured CDN domains
SELECT id, name, bucket_name, cdn_url, is_active FROM storage_buckets;

-- 2. Clear broken CDN URL from a specific bucket (falls back to origin)
UPDATE storage_buckets 
SET cdn_url = NULL 
WHERE id = 'your-bucket-uuid-here';

-- 3. Verify assets are linked to active buckets
SELECT 
    m.asset_id, 
    m.storage_key, 
    b.bucket_name, 
    b.cdn_url,
    COALESCE(b.cdn_url, 'https://' || b.bucket_name || '.s3.' || b.region || '.amazonaws.com') || '/' || m.storage_key AS live_url
FROM media_assets m
JOIN storage_buckets b ON m.bucket_id = b.id
WHERE m.is_deleted = false
LIMIT 10;
```

---

## 3. How to Properly Link a Custom Subdomain (e.g., `cdn.yourdomain.com`)

There are two primary methods to connect your custom subdomain to Cloudflare R2 or S3:

### Method A: Cloudflare R2 Native Custom Domain (Recommended — 1 Click, Free SSL)

If your DNS is managed by Cloudflare:
1. Open the **Cloudflare Dashboard** → **R2 Object Storage**.
2. Click on your target bucket (e.g., `mms-assets-bucket`).
3. Navigate to the **Settings** tab.
4. Scroll down to **"Custom Domains"** and click **"Connect Domain"**.
5. Enter your desired subdomain: `cdn.yourdomain.com` (or `media.yourdomain.com`).
6. Click **"Continue"** → **"Connect Domain"**.
7. Cloudflare will automatically:
   - Create the necessary DNS CNAME record in your Cloudflare zone.
   - Issue and bind a free Universal SSL/TLS certificate.
   - Enable Cloudflare edge caching across 330+ cities worldwide.
8. Wait 1–2 minutes for SSL certificate validation to show **"Active"**.
9. In MMS CloudVault: Go to **Bucket Management** → **Edit Bucket** → Set **CDN URL** to `https://cdn.yourdomain.com`.

---

### Method B: Cloudflare Worker Edge Proxy (Advanced Caching & Custom Headers)

If you want fine-grained control over caching headers, CORS, or WebP conversion at the edge:

1. In Cloudflare Dashboard, go to **Workers & Pages** → **Create Application** → **Create Worker**.
2. Name it `mms-cdn-gateway`.
3. In the Worker code editor, paste the following 20-line edge proxy:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Target your raw R2 or S3 public endpoint
    const originHost = "pub-xxxxxxxx.r2.dev"; // Or your S3 origin
    url.hostname = originHost;

    // Fetch from origin with Cloudflare Edge Caching
    const response = await fetch(url.toString(), {
      headers: request.headers,
      cf: {
        cacheEverything: true,
        cacheTtl: 31536000, // Cache for 1 year at edge
      },
    });

    // Clone response and inject high-performance HTTP headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
    newHeaders.set("X-CDN-Gateway", "MMS-CloudVault-Edge");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
```

4. Click **Deploy**.
5. Go to your Worker's **Settings** → **Triggers** → **Custom Domains** → Add `cdn.yourdomain.com`.
6. Set your bucket's CDN URL in MMS CloudVault to `https://cdn.yourdomain.com`.

---

## 4. Verification & Testing Checklist

Once your custom subdomain is linked, test it using `curl` from your terminal:

```bash
# Test HTTP Status and Headers
curl -I https://cdn.yourdomain.com/images/202610/sample.webp
```

Expected output:
```http
HTTP/2 200
content-type: image/webp
cache-control: public, max-age=31536000, immutable
cf-cache-status: HIT
access-control-allow-origin: *
```

- `HTTP/2 200`: Subdomain is resolving and serving the file.
- `cf-cache-status: HIT`: The file is cached at Cloudflare's edge with 0 ms origin latency.
- `content-type: image/webp`: Sharp optimization engine delivered the modern WebP format.
