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
