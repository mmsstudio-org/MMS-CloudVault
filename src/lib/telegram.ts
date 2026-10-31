import { db } from "@/db";
import { siteSettings } from "@/db/schema";

export interface TelegramNotificationParams {
  event:
    | "ASSET_UPLOADED"
    | "ASSET_REPLACED"
    | "ASSET_SOFT_DELETED"
    | "ASSET_PERMANENTLY_DELETED"
    | "ASSET_DELETED" // Legacy compatibility alias
    | "TRASH_PURGED";
  appName: string;
  assetId?: string;
  title?: string;
  publicUrl?: string;
  sizeKb?: number;
  savedKb?: number;
  count?: number;
  mimeType?: string;
  uploaderName?: string | null;
  info?: string | null;
  folder?: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramNotification(
  params: TelegramNotificationParams
): Promise<boolean> {
  try {
    const settings = await db.select().from(siteSettings).limit(1);
    const botToken =
      settings[0]?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId =
      settings[0]?.telegramChatId || process.env.TELEGRAM_CHAT_ID;
    const isEnabled =
      settings[0]?.telegramNotificationsEnabled ?? false;

    if (!isEnabled || !botToken || !chatId) {
      return false;
    }

    let text = "";
    const appName = escapeHtml(params.appName || "MMS Studio Client");
    const id = escapeHtml(params.assetId || "asset");
    const isAudio = params.mimeType?.startsWith("audio/");
    const safeTitle = params.title ? escapeHtml(params.title) : "";
    const safeFolder = params.folder ? escapeHtml(params.folder.trim()) : "";
    const safeUploader = params.uploaderName ? escapeHtml(params.uploaderName.trim()) : "";
    const safeInfo = params.info ? escapeHtml(params.info.trim()) : "";

    switch (params.event) {
      case "ASSET_UPLOADED":
        text = isAudio
          ? `🎵 <b>New Audio Track Uploaded</b>\n` +
            `• <b>App:</b> ${appName}\n` +
            `• <b>Asset ID:</b> <code>${id}</code>\n` +
            (safeTitle ? `• <b>Title:</b> ${safeTitle}\n` : "") +
            (safeFolder ? `• <b>Folder:</b> <code>${safeFolder}</code>\n` : "") +
            (safeUploader ? `• <b>Uploader:</b> 👤 <b>${safeUploader}</b>\n` : "") +
            (safeInfo ? `• <b>Info:</b> 📝 <i>${safeInfo}</i>\n` : "") +
            `• <b>Format:</b> ${params.mimeType || "audio/mpeg"}\n` +
            `• <b>Size:</b> ${params.sizeKb || 0} KB\n` +
            (params.publicUrl ? `• <b>URL:</b> <a href="${params.publicUrl}">Listen Audio</a>` : "")
          : `🚀 <b>New Media Asset Uploaded</b>\n` +
            `• <b>App:</b> ${appName}\n` +
            `• <b>Asset ID:</b> <code>${id}</code>\n` +
            (safeTitle ? `• <b>Title:</b> ${safeTitle}\n` : "") +
            (safeFolder ? `• <b>Folder:</b> <code>${safeFolder}</code>\n` : "") +
            (safeUploader ? `• <b>Uploader:</b> 👤 <b>${safeUploader}</b>\n` : "") +
            (safeInfo ? `• <b>Info:</b> 📝 <i>${safeInfo}</i>\n` : "") +
            `• <b>Size:</b> ${params.sizeKb || 0} KB` +
            (params.savedKb ? ` (Saved ${params.savedKb} KB)\n` : `\n`) +
            (params.publicUrl ? `• <b>URL:</b> <a href="${params.publicUrl}">View Asset</a>` : "");
        break;

      case "ASSET_REPLACED":
        text = `🔄 <b>Media Asset Updated & Replaced</b>\n` +
          `• <b>App:</b> ${appName}\n` +
          `• <b>Asset ID:</b> <code>${id}</code>\n` +
          (safeTitle ? `• <b>Title:</b> ${safeTitle}\n` : "") +
          (safeFolder ? `• <b>Folder:</b> <code>${safeFolder}</code>\n` : "") +
          (safeUploader ? `• <b>Uploader:</b> 👤 <b>${safeUploader}</b>\n` : "") +
          (safeInfo ? `• <b>Info:</b> 📝 <i>${safeInfo}</i>\n` : "") +
          `• <b>New Size:</b> ${params.sizeKb || 0} KB\n` +
          (params.publicUrl ? `• <b>URL:</b> <a href="${params.publicUrl}">View Asset</a>` : "");
        break;

      case "ASSET_SOFT_DELETED":
        text = `🟡 <b>Media Asset Moved to Trash (Soft Delete)</b>\n` +
          `• <b>App:</b> ${appName}\n` +
          `• <b>Asset ID:</b> <code>${id}</code>\n` +
          (safeTitle ? `• <b>Title:</b> ${safeTitle}\n` : "") +
          (safeFolder ? `• <b>Folder:</b> <code>${safeFolder}</code>\n` : "") +
          (safeUploader ? `• <b>Uploader:</b> 👤 ${safeUploader}\n` : "") +
          (safeInfo ? `• <b>Info:</b> 📝 <i>${safeInfo}</i>\n` : "") +
          `• <b>Status:</b> ⏳ <i>Retained in Trash for 30 days (Recoverable)</i>`;
        break;

      case "ASSET_PERMANENTLY_DELETED":
      case "ASSET_DELETED":
        text = `🔴 <b>Media Asset Permanently Destroyed (Hard Delete)</b>\n` +
          `• <b>App:</b> ${appName}\n` +
          `• <b>Asset ID:</b> <code>${id}</code>\n` +
          (safeTitle ? `• <b>Title:</b> ${safeTitle}\n` : "") +
          (safeFolder ? `• <b>Folder:</b> <code>${safeFolder}</code>\n` : "") +
          (safeUploader ? `• <b>Original Uploader:</b> 👤 ${safeUploader}\n` : "") +
          `• <b>Storage:</b> 💥 <i>Physical file destroyed from Cloud Bucket</i>\n` +
          `• <b>Status:</b> ❌ <i>Irrevocable (Cannot be recovered)</i>`;
        break;

      case "TRASH_PURGED":
        text = `🧹 <b>Trash Cleaned Up</b>\n` +
          `• <b>Purged Assets:</b> ${params.count || 0} items permanently deleted.`;
        break;
    }

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      }
    );

    return res.ok;
  } catch (err) {
    console.warn("Failed to dispatch telegram notification:", err);
    return false;
  }
}
