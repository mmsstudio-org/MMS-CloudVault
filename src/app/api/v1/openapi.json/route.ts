import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "MMS Studio Storage REST API",
      description:
        "High-performance, automated media asset ingestion, Sharp optimization pipeline, progressive BlurHash calculation, and Cloudflare R2 / S3 object delivery for mobile apps, web applications, and publishing platforms.",
      version: "1.0.0",
      contact: {
        name: "MMS Studio Engineering",
        url: "https://studio.sabbirmms.com",
        email: "sabbirmms@gmail.com",
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
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      "/api/v1/upload": {
        post: {
          summary: "Upload, optimize and assign media asset",
          description:
            "Uploads a media image, automatically scales it within max dimension, converts to WebP, limits file size, and generates a compact BlurHash placeholder. Automatically replaces existing image for duplicate asset IDs under the same application.",
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
                      description: "Unique identifier of the media item or document from client app",
                      example: "banner_promo_01",
                    },
                    title: {
                      type: "string",
                      description: "Descriptive human-readable title for the media asset",
                      example: "Seasonal Promotion Banner",
                    },
                    folder: {
                      type: "string",
                      description: "Category or sub-folder inside the app namespace",
                      example: "banners",
                    },
                    file: {
                      type: "string",
                      format: "binary",
                      description: "Binary image file (JPEG, PNG, WebP, GIF, SVG)",
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
              description: "Uploaded file is not a supported image format",
            },
          },
        },
      },
      "/api/v1/assets/{asset_id}": {
        get: {
          summary: "Retrieve direct public URL and metadata for a media asset",
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
          summary: "Move media asset to Trash (Soft delete with 30-day recovery)",
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
              description: "Media asset successfully moved to trash",
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
