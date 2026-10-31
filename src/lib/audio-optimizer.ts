import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";

export interface AudioOptimizationOptions {
  compress?: boolean;
  bitrate?: "96k" | "128k" | "192k" | "256k" | "320k";
  channels?: 1 | 2; // 1 = Mono (great for voiceovers), 2 = Stereo
}

export interface OptimizedAudioResult {
  optimizedBuffer: Buffer;
  originalSizeKb: number;
  optimizedSizeKb: number;
  savedKb: number;
  mimeType: string;
  ext: string;
}

/**
 * Optimizes audio buffers using FFmpeg when compression is requested.
 * By default, keeps audio in original fidelity without modification.
 */
export async function optimizeAudio(
  buffer: Buffer,
  fileName: string = "audio.mp3",
  inputMime: string = "audio/mpeg",
  options?: AudioOptimizationOptions
): Promise<OptimizedAudioResult> {
  const originalSizeKb = Math.round(buffer.length / 1024) || 1;

  // Determine original extension
  let ext = "mp3";
  let finalMime = "audio/mpeg";

  if (fileName.endsWith(".wav") || inputMime === "audio/wav") {
    ext = "wav";
    finalMime = "audio/wav";
  } else if (fileName.endsWith(".ogg") || inputMime === "audio/ogg") {
    ext = "ogg";
    finalMime = "audio/ogg";
  } else if (
    fileName.endsWith(".m4a") ||
    inputMime === "audio/mp4" ||
    inputMime === "audio/x-m4a"
  ) {
    ext = "m4a";
    finalMime = "audio/mp4";
  } else if (fileName.endsWith(".aac") || inputMime === "audio/aac") {
    ext = "aac";
    finalMime = "audio/aac";
  } else if (fileName.endsWith(".flac") || inputMime === "audio/flac") {
    ext = "flac";
    finalMime = "audio/flac";
  }

  // 1. By default: Do not compress, preserve 100% original fidelity
  if (!options?.compress) {
    return {
      optimizedBuffer: buffer,
      originalSizeKb,
      optimizedSizeKb: originalSizeKb,
      savedKb: 0,
      mimeType: finalMime,
      ext,
    };
  }

  // 2. Compression requested: check if ffmpeg is available
  const bitrate = options.bitrate || "192k";
  const tempId = `audio_opt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tempIn = path.join(os.tmpdir(), `${tempId}.${ext}`);
  const tempOut = path.join(os.tmpdir(), `${tempId}_out.mp3`);

  try {
    fs.writeFileSync(tempIn, buffer);

    const ffmpegArgs = [
      "-y",
      "-i",
      tempIn,
      "-vn", // Strip video tracks
      "-b:a",
      bitrate,
      "-ar",
      "44100",
    ];

    if (options.channels) {
      ffmpegArgs.push("-ac", String(options.channels));
    }

    ffmpegArgs.push(tempOut);

    execFileSync("ffmpeg", ffmpegArgs, { stdio: "pipe" });

    if (fs.existsSync(tempOut)) {
      const optimizedBuffer = fs.readFileSync(tempOut);
      const optimizedSizeKb = Math.round(optimizedBuffer.length / 1024) || 1;
      const savedKb = Math.max(0, originalSizeKb - optimizedSizeKb);

      return {
        optimizedBuffer,
        originalSizeKb,
        optimizedSizeKb,
        savedKb,
        mimeType: "audio/mpeg",
        ext: "mp3",
      };
    }
  } catch (err) {
    console.warn(
      "[Audio Optimizer] Compression failed or ffmpeg not accessible, falling back to original audio:",
      err
    );
  } finally {
    // Always clean up temp files
    try {
      if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
      if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    } catch {
      // Ignore cleanup error
    }
  }

  // Graceful fallback to original
  return {
    optimizedBuffer: buffer,
    originalSizeKb,
    optimizedSizeKb: originalSizeKb,
    savedKb: 0,
    mimeType: finalMime,
    ext,
  };
}
