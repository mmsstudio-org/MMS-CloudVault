import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const host = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";

  const postmanCollection = {
    info: {
      _postman_id: "mms-cloudvault-v1-collection",
      name: "MMS CloudVault REST API",
      description:
        "Official Postman Collection for MMS CloudVault. Media upload, Sharp WebP transformation, MP3 audio storage, BlurHash generation, asset retrieval, and trash management.",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      version: "1.0.0",
    },
    variable: [
      {
        key: "baseUrl",
        value: host,
        type: "string",
      },
      {
        key: "apiKey",
        value: "mms_live_your_api_key_here",
        type: "string",
      },
    ],
    auth: {
      type: "apikey",
      apikey: [
        {
          key: "key",
          value: "x-api-key",
          type: "string",
        },
        {
          key: "value",
          value: "{{apiKey}}",
          type: "string",
        },
        {
          key: "in",
          value: "header",
          type: "string",
        },
      ],
    },
    item: [
      {
        name: "Media Assets",
        description: "Endpoints for uploading, querying, and managing media files (Images and Audio).",
        item: [
          {
            name: "Upload Media Asset (Image or Audio)",
            request: {
              method: "POST",
              header: [
                {
                  key: "X-Firebase-AppCheck",
                  value: "{{appCheckToken}}",
                  description:
                    "Optional Firebase App Check / Play Integrity JWT token for mobile apps",
                  disabled: true,
                },
              ],
              body: {
                mode: "formdata",
                formdata: [
                  {
                    key: "asset_id",
                    value: "banner_promo_01",
                    description: "Unique asset identifier within your app namespace (deduplicates automatically).",
                    type: "text",
                  },
                  {
                    key: "title",
                    value: "Seasonal Promotion Banner",
                    description: "Human-readable descriptive title for the media.",
                    type: "text",
                  },
                  {
                    key: "folder",
                    value: "banners",
                    description: "Sub-folder or category for organizing assets.",
                    type: "text",
                  },
                  {
                    key: "uploader_name",
                    value: "Sabbir Ahmed",
                    description: "Optional creator or service name who uploaded the asset.",
                    type: "text",
                  },
                  {
                    key: "info",
                    value: "Production campaign hero",
                    description: "Optional notes or tracking context.",
                    type: "text",
                  },
                  {
                    key: "file",
                    description: "Select binary image (JPEG/PNG/WebP) or audio file (MP3/WAV/M4A).",
                    type: "file",
                    src: [],
                  },
                ],
              },
              url: {
                raw: "{{baseUrl}}/api/v1/upload",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "upload"],
              },
              description:
                "Uploads an image or audio asset. Images undergo on-the-fly Sharp optimization to WebP with aspect-ratio scaling and BlurHash extraction. Audio files (MP3/WAV/etc.) are stored directly with full streaming capability.",
            },
            response: [],
          },
          {
            name: "Request Direct Pre-signed Upload URL (Bypass 4.5MB Server Limit)",
            request: {
              method: "POST",
              header: [
                {
                  key: "Content-Type",
                  value: "application/json",
                  type: "text",
                },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify(
                  {
                    asset_id: "podcast_ep_01",
                    file_name: "audio_track.mp3",
                    mime_type: "audio/mpeg",
                    folder: "podcasts",
                    title: "Episode 1 Master Audio",
                    uploader_name: "Sabbir / Creator Studio",
                    info: "Direct client upload via S3 pre-signed URL",
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: "{{baseUrl}}/api/v1/upload/presigned",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "upload", "presigned"],
              },
              description:
                "Generates a secure, 5-minute pre-signed PUT URL directly targeting Neon S3 or Cloudflare R2 bucket. Used for large files (10MB-50MB+) to bypass Vercel serverless body size limits.",
            },
            response: [],
          },
          {
            name: "Complete Direct Pre-signed Upload (Confirm & Save in DB)",
            request: {
              method: "POST",
              header: [
                {
                  key: "Content-Type",
                  value: "application/json",
                  type: "text",
                },
              ],
              body: {
                mode: "raw",
                raw: JSON.stringify(
                  {
                    asset_id: "podcast_ep_01",
                    storage_key: "golpo-ghor/podcasts/podcast_ep_01.mp3",
                    public_url: "https://media.sabbirmms.com/golpo-ghor/podcasts/podcast_ep_01.mp3",
                    folder: "podcasts",
                    title: "Episode 1 Master Audio",
                    uploader_name: "Sabbir / Creator Studio",
                    info: "Direct client upload via S3 pre-signed URL",
                    mime_type: "audio/mpeg",
                    file_size_kb: 18450,
                  },
                  null,
                  2
                ),
              },
              url: {
                raw: "{{baseUrl}}/api/v1/upload/complete",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "upload", "complete"],
              },
              description:
                "Notifies server that client-side binary PUT to pre-signed S3 URL succeeded. Verifies key, registers metadata in Neon DB, and emits Telegram notification.",
            },
            response: [],
          },
          {
            name: "Get Media Asset by ID",
            request: {
              method: "GET",
              header: [],
              url: {
                raw: "{{baseUrl}}/api/v1/assets/:asset_id",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "assets", ":asset_id"],
                variable: [
                  {
                    key: "asset_id",
                    value: "banner_promo_01",
                    description: "The unique ID of the media asset.",
                  },
                ],
              },
              description: "Returns the public CDN URL, dimensions, BlurHash, MIME type, and metadata for a specific media item.",
            },
            response: [],
          },
          {
            name: "Delete Asset Permanently (Purge from Storage)",
            request: {
              method: "DELETE",
              header: [],
              url: {
                raw: "{{baseUrl}}/api/v1/assets/:asset_id",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "assets", ":asset_id"],
                variable: [
                  {
                    key: "asset_id",
                    value: "banner_promo_01",
                    description: "The unique ID of the media asset to permanently delete.",
                  },
                ],
              },
              description:
                "Permanently destroys the physical media file from Cloud Object Storage (S3 / R2) and removes the database record. Pass query parameter ?soft=true to move to trash instead.",
            },
            response: [],
          },
        ],
      },
      {
        name: "Maintenance & Automated Cleanup",
        description: "Background maintenance tasks.",
        item: [
          {
            name: "Run Expired Trash Cleanup (Cron)",
            request: {
              auth: {
                type: "noauth",
              },
              method: "POST",
              header: [
                {
                  key: "Authorization",
                  value: "Bearer your_cron_secret_here",
                  type: "text",
                },
              ],
              url: {
                raw: "{{baseUrl}}/api/v1/cron/cleanup-trash",
                host: ["{{baseUrl}}"],
                path: ["api", "v1", "cron", "cleanup-trash"],
              },
              description: "Permanently purges assets from storage and database that have been in Trash for more than 30 days.",
            },
            response: [],
          },
        ],
      },
    ],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (shouldDownload) {
    headers["Content-Disposition"] = 'attachment; filename="mms-cloudvault.postman_collection.json"';
  }

  return new NextResponse(JSON.stringify(postmanCollection, null, 2), {
    status: 200,
    headers,
  });
}
