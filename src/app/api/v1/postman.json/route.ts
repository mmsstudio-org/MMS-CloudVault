import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const host = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shouldDownload = request.nextUrl.searchParams.get("download") === "1";

  const postmanCollection = {
    info: {
      _postman_id: "mms-cloudvault-v1-collection",
      name: "MMS CloudVault REST API",
      description:
        "Official Postman Collection for MMS CloudVault (MMS Studio Storage). Media upload, Sharp WebP transformation, MP3 audio storage, BlurHash generation, asset retrieval, and trash management.",
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
              header: [],
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
            name: "Soft Delete Asset (Move to Trash)",
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
                    description: "The unique ID of the media asset to move to trash.",
                  },
                ],
              },
              description: "Soft deletes an asset by moving it to Trash. Retained for 30 days before permanent cleanup.",
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
