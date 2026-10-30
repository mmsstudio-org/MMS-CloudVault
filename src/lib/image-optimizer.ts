import sharp from "sharp";
import { encode } from "blurhash";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";

export interface OptimizationResult {
  optimizedBuffer: Buffer;
  originalSizeKb: number;
  optimizedSizeKb: number;
  width: number;
  height: number;
  blurHash: string;
  mimeType: string;
  format: string;
}

export interface ImageOptimizationOptions {
  maxDimensionPx?: number;
  maxFileKb?: number;
  compressionQuality?: number;
}

/**
 * Retrieves the dynamic site settings from DB with robust default fallbacks
 */
export async function getOptimizationSettings(): Promise<{
  maxDimensionPx: number;
  maxFileKb: number;
  compressionQuality: number;
}> {
  try {
    const settings = await db.select().from(siteSettings).limit(1);
    if (settings.length > 0) {
      return {
        maxDimensionPx: settings[0].maxDimensionPx || 2048,
        maxFileKb: settings[0].maxFileKb || 1024,
        compressionQuality: settings[0].compressionQuality || 80,
      };
    }
  } catch (err) {
    console.warn("Could not query site_settings for image optimizer, using fallbacks:", err);
  }

  return {
    maxDimensionPx: 2048,
    maxFileKb: 1024,
    compressionQuality: 80,
  };
}

/**
 * Optimizes an uploaded image buffer according to global capping rules:
 * 1. Aspect ratio scaling under maxDimensionPx
 * 2. WebP conversion
 * 3. Dynamic size trimming under maxFileKb
 * 4. Ultra-light BlurHash placeholder generation
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  options?: ImageOptimizationOptions
): Promise<OptimizationResult> {
  const originalSizeKb = Math.round(inputBuffer.length / 1024);
  const defaultSettings = await getOptimizationSettings();

  const maxDimension = options?.maxDimensionPx ?? defaultSettings.maxDimensionPx;
  const maxKb = options?.maxFileKb ?? defaultSettings.maxFileKb;
  let targetQuality = options?.compressionQuality ?? defaultSettings.compressionQuality;

  // 1. Initial metadata inspection
  const initialPipeline = sharp(inputBuffer, { failOnError: false });
  const meta = await initialPipeline.metadata();

  // 2. Aspect-Ratio Preserving Dimension Scaling
  let pipeline = sharp(inputBuffer, { failOnError: false }).rotate(); // Auto-rotates according to EXIF

  const shouldResize =
    (meta.width && meta.width > maxDimension) ||
    (meta.height && meta.height > maxDimension);

  if (shouldResize) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // 3. WebP Conversion with iterative quality capping if over maxFileKb
  let currentQuality = targetQuality;
  let optimizedBuffer = await pipeline
    .clone()
    .webp({ quality: currentQuality, effort: 4 })
    .toBuffer();

  let optimizedSizeKb = Math.round(optimizedBuffer.length / 1024);

  // If size is still larger than maxFileKb, iteratively reduce quality
  while (optimizedSizeKb > maxKb && currentQuality > 40) {
    currentQuality -= 10;
    optimizedBuffer = await pipeline
      .clone()
      .webp({ quality: currentQuality, effort: 4 })
      .toBuffer();
    optimizedSizeKb = Math.round(optimizedBuffer.length / 1024);
  }

  // 4. Extract final optimized dimensions
  const finalMeta = await sharp(optimizedBuffer).metadata();
  const width = finalMeta.width || meta.width || 0;
  const height = finalMeta.height || meta.height || 0;

  // 5. Generate BlurHash
  let blurHash = "";
  try {
    const rawRes = await sharp(optimizedBuffer)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    blurHash = encode(
      new Uint8ClampedArray(rawRes.data),
      rawRes.info.width,
      rawRes.info.height,
      4,
      3
    );
  } catch (err) {
    console.warn("Failed to generate BlurHash, continuing without it:", err);
  }

  return {
    optimizedBuffer,
    originalSizeKb,
    optimizedSizeKb,
    width,
    height,
    blurHash,
    mimeType: "image/webp",
    format: "webp",
  };
}
