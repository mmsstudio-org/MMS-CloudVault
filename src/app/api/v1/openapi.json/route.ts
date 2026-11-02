import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "MMS CloudVault REST API",
      description:
        "High-performance, automated media asset ingestion, Sharp WebP optimization pipeline, progressive BlurHash calculation, and Cloudflare R2 / S3 object delivery for mobile apps, web applications, and media platforms.",
      version: "2.0.0",
      contact: {
        name: "MMS CloudVault Engineering",
        url: "https://cloud.sabbirmms.com",
        email: "mr.sabbirmms@gmail.com",
      },
    },
    servers: [
      {
        url: baseUrl,
        description: "Primary Media Engine API Host",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "MMS Studio App Secret Key (configured per application)",
        },
        AppCheckAuth: {
          type: "apiKey",
          in: "header",
          name: "X-Firebase-AppCheck",
          description:
            "Google Play Integrity / Firebase App Check JWT token (required when App Check policy is enforced on the API Key)",
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/api/v1/upload": {
        post: {
          summary: "Upload, optimize and assign media asset",
          description:
            "Uploads a media image or audio file. Images are automatically scaled, converted to WebP, and assigned a BlurHash. Audio files (MP3, WAV, OGG, M4A, AAC) can be optionally compressed via FFmpeg or stored in 100% original fidelity. Automatically replaces duplicate asset IDs under the same application.",
          security: [{ ApiKeyAuth: [] }, { AppCheckAuth: [] }],
          parameters: [
            {
              name: "X-Firebase-AppCheck",
              in: "header",
              required: false,
              schema: { type: "string" },
              description:
                "Google Play Integrity / Firebase App Check JWT token for mobile app attestation",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["asset_id", "file"],
                  properties: {
                    asset_id: {
                      type: "string",
                      description:
                        "Unique identifier of the media item or document from client app",
                      example: "banner_promo_01",
                    },
                    title: {
                      type: "string",
                      description:
                        "Descriptive human-readable title for the media asset",
                      example: "Seasonal Promotion Banner",
                    },
                    folder: {
                      type: "string",
                      description:
                        "Category or sub-folder inside the app namespace",
                      example: "banners",
                    },
                    uploader_name: {
                      type: "string",
                      description:
                        "Optional: Name or identifier of the end user or client submitting this media",
                      example: "John Doe / AppClient-42",
                    },
                    info: {
                      type: "string",
                      description:
                        "Optional: Short metadata context, remark, or descriptive info",
                      example: "Profile avatar compressed for mobile client",
                    },
                    file: {
                      type: "string",
                      format: "binary",
                      description:
                        "Binary image (JPEG, PNG, WebP, GIF, SVG) or audio file (MP3, WAV, OGG, M4A, AAC, FLAC)",
                    },
                    compress_audio: {
                      type: "boolean",
                      description:
                        "Optional: Set to true to compress audio tracks. Default is false (100% lossless original fidelity).",
                      example: false,
                    },
                    audio_bitrate: {
                      type: "string",
                      enum: ["96k", "128k", "192k", "256k", "320k"],
                      description:
                        "Optional: Target bitrate when compress_audio is true. Default is 192k.",
                      example: "192k",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Asset successfully processed and saved",
            },
            400: {
              description: "Missing required asset_id or file",
            },
            401: {
              description: "Invalid or inactive API Key",
            },
            415: {
              description:
                "Uploaded file is not a supported image or audio format",
            },
          },
        },
      },
      "/api/v1/upload/presigned": {
        post: {
          summary: "Step 1: Request S3 Pre-signed URL for direct large media PUT upload",
          description:
            "### 3-Step Direct Upload Lifecycle\n\nBypasses server body size limits (e.g., Vercel's 4.5MB ceiling) for large audio tracks or assets (up to 50MB+).\n\n" +
            "**Step 1:** Call this endpoint with `asset_id` and `mime_type` to receive a secure, 5-minute pre-signed S3 `upload_url`.\n\n" +
            "**Step 2 (Direct S3 PUT):** Execute an HTTP `PUT` directly to `upload_url` with raw binary file in the request body.\n" +
            "```bash\n" +
            "curl -X PUT \"<upload_url>\" \\\n" +
            "  -H \"Content-Type: audio/mpeg\" \\\n" +
            "  --data-binary \"@/path/to/podcast.mp3\"\n" +
            "```\n" +
            "*Note: Header `Content-Type` must match the exact `mime_type` specified in Step 1. In Postman, select Method: PUT, Body: binary, and choose file.*\n\n" +
            "**Step 3:** Call `/api/v1/upload/complete` with `upload_token`, `asset_id`, `storage_key`, `public_url`, and `bucket_id` to register the asset in Neon PostgreSQL and fire Telegram alerts.",
          security: [{ ApiKeyAuth: [] }, { AppCheckAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["asset_id"],
                  properties: {
                    asset_id: {
                      type: "string",
                      description: "Unique media identifier",
                      example: "large_podcast_01",
                    },
                    file_name: {
                      type: "string",
                      description: "Original client filename with extension",
                      example: "episode_full.mp3",
                    },
                    mime_type: {
                      type: "string",
                      description: "MIME type of media file",
                      example: "audio/mpeg",
                    },
                    folder: {
                      type: "string",
                      description: "Folder or namespace category",
                      example: "audio",
                    },
                    title: {
                      type: "string",
                      description: "Optional human-readable title",
                      example: "Episode 1 Full Track",
                    },
                    uploader_name: {
                      type: "string",
                      description: "Name of user or service uploading",
                      example: "Sabbir / Creator App",
                    },
                    info: {
                      type: "string",
                      description: "Optional context note or remark",
                      example: "High fidelity lossless master",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Pre-signed URL successfully generated",
            },
            400: {
              description: "Bad Request: Missing required asset_id",
            },
            401: {
              description: "Unauthorized: Invalid API Key",
            },
          },
        },
      },
      "/api/v1/upload/complete": {
        post: {
          summary: "Step 3: Confirm direct S3 Pre-signed upload and register in database",
          description:
            "Final step of the Direct Pre-signed upload lifecycle. Called immediately after the client successfully PUTs the media file directly to the object storage pre-signed URL in Step 2. Registers database metadata, associates bucket ownership, executes deduplication/replacement of older assets if applicable, and triggers telegram notifications.",
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["upload_token", "asset_id", "storage_key", "public_url", "bucket_id"],
                  properties: {
                    asset_id: {
                      type: "string",
                      example: "large_podcast_01",
                    },
                    upload_token: {
                      type: "string",
                      description: "Copy data.upload_token from the presigned response. Bound to this app, asset and object; valid for 30 minutes.",
                    },
                    storage_key: {
                      type: "string",
                      example: "golpo-ghor/audio/large_podcast_01.mp3",
                    },
                    public_url: {
                      type: "string",
                      example: "https://media.sabbirmms.com/golpo-ghor/audio/large_podcast_01.mp3",
                    },
                    bucket_id: {
                      type: "string",
                      format: "uuid",
                    },
                    folder: {
                      type: "string",
                      example: "audio",
                    },
                    title: {
                      type: "string",
                      example: "Episode 1 Full Track",
                    },
                    uploader_name: {
                      type: "string",
                      example: "Sabbir / Creator App",
                    },
                    info: {
                      type: "string",
                      example: "High fidelity lossless master",
                    },
                    mime_type: {
                      type: "string",
                      example: "audio/mpeg",
                    },
                    file_size_kb: {
                      type: "number",
                      example: 18450,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Asset registered and saved in database",
            },
            400: {
              description: "Bad Request: Missing required fields",
            },
          },
        },
      },
      "/api/v1/assets/{asset_id}": {
        get: {
          summary: "Retrieve direct public URL and metadata for a media asset",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "asset_id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Unique media asset identifier",
              example: "banner_promo_01",
            },
          ],
          responses: {
            200: {
              description: "Media asset details found",
            },
            404: {
              description: "Asset not found for this asset ID",
            },
          },
        },
        delete: {
          summary:
            "Permanently delete media asset from storage and database",
          description:
            "Permanently erases the physical media file (image or audio) from Cloud Object Storage and removes the database record. Pass query parameter ?soft=true if you only wish to move it to trash.",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "asset_id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Unique media asset identifier",
              example: "banner_promo_01",
            },
            {
              name: "soft",
              in: "query",
              required: false,
              schema: { type: "boolean" },
              description:
                "Set to true to soft-delete to trash instead of permanent storage destruction",
              example: false,
            },
          ],
          responses: {
            200: {
              description: "Media asset successfully deleted",
            },
            404: {
              description: "Media asset not found",
            },
          },
        },
      },
      "/api/v1/cron/cleanup-trash": {
        post: {
          summary: "Trigger automated garbage collection of expired trash",
          description:
            "Permanently destroys assets in the trash that have exceeded the 30-day retention policy from both Object Storage and the database. Requires Bearer CRON_SECRET.",
          security: [],
          parameters: [
            {
              name: "Authorization",
              in: "header",
              required: true,
              schema: { type: "string", example: "Bearer your_cron_secret" },
            },
          ],
          responses: {
            200: {
              description: "Cleanup completed",
            },
            401: {
              description: "Unauthorized",
            },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
