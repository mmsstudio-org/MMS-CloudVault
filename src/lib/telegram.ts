import { db } from "@/db";
import { siteSettings } from "@/db/schema";

export interface TelegramNotificationParams {
  event: "ASSET_UPLOADED" | "ASSET_REPLACED" | "ASSET_DELETED" | "TRASH_PURGED";
  appName: string;
  assetId?: string;
  title?: string;
  publicUrl?: string;
  sizeKb?: number;
  savedKb?: number;
  count?: number;
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
    const appName = params.appName || "MMS Studio Client";
    const id = params.assetId || "asset";

    switch (params.event) {
      case "ASSET_UPLOADED":
        text = `🚀 <b>New Media Asset Uploaded</b>\n` +
          `• <b>App:</b> ${appName}\n` +
          `• <b>Asset ID:</b> <code>${id}</code>\n` +
          (params.title ? `• <b>Title:</b> ${params.title}\n` : "") +
          `• <b>Size:</b> ${params.sizeKb || 0} KB (Saved ${params.savedKb || 0} KB)\n` +
          (params.publicUrl ? `• <b>URL:</b> <a href="${params.publicUrl}">View Asset</a>` : "");
        break;

      case "ASSET_REPLACED":
        text = `🔄 <b>Media Asset Updated & Replaced</b>\n` +
          `• <b>App:</b> ${appName}\n` +
          `• <b>Asset ID:</b> <code>${id}</code>\n` +
          (params.title ? `• <b>Title:</b> ${params.title}\n` : "") +
          `• <b>New Size:</b> ${params.sizeKb || 0} KB\n` +
          (params.publicUrl ? `• <b>URL:</b> <a href="${params.publicUrl}">View Asset</a>` : "");
        break;

      case "ASSET_DELETED":
        text = `🗑️ <b>Media Asset Moved to Trash</b>\n` +
          `• <b>App:</b> ${appName}\n` +
          `• <b>Asset ID:</b> <code>${id}</code>`;
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
