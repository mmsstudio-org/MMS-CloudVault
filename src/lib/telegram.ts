import { db } from "@/db";
import { sql } from "drizzle-orm";
import { siteSettings } from "@/db/schema";

export interface TelegramNotificationParams {
  eventKey?: string;
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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function dispatchTelegramNotification(
  params: TelegramNotificationParams
): Promise<{ messageId?: string; error?: string; retryAfter?: number; disabled?: boolean }> {
  try {
    const settings = await db.select().from(siteSettings).limit(1);
    const botToken =
      settings[0]?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId =
      settings[0]?.telegramChatId || process.env.TELEGRAM_CHAT_ID;
    const isEnabled =
      settings[0]?.telegramNotificationsEnabled ?? false;

    if (!isEnabled || !botToken || !chatId) {
      return { disabled: true };
    }

    // Bound user metadata before escaping so Telegram HTML stays well formed.
    params = { ...params, appName: params.appName.slice(0, 160), assetId: params.assetId?.slice(0, 200), title: params.title?.slice(0, 240), info: params.info?.slice(0, 500), folder: params.folder?.slice(0, 120), uploaderName: params.uploaderName?.slice(0, 120) };
    try {
      if (params.publicUrl && (params.publicUrl.length > 1500 || !["https:", "http:"].includes(new URL(params.publicUrl).protocol))) params.publicUrl = undefined;
    } catch { params.publicUrl = undefined; }
    const safeUrl = params.publicUrl ? escapeHtml(params.publicUrl) : "";
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
            `• <b>Format:</b> ${escapeHtml((params.mimeType || "audio/mpeg").slice(0, 100))}\n` +
            `• <b>Size:</b> ${params.sizeKb || 0} KB\n` +
            (params.publicUrl ? `• <b>URL:</b> <a href="${safeUrl}">Listen Audio</a>` : "")
          : `🚀 <b>New Media Asset Uploaded</b>\n` +
            `• <b>App:</b> ${appName}\n` +
            `• <b>Asset ID:</b> <code>${id}</code>\n` +
            (safeTitle ? `• <b>Title:</b> ${safeTitle}\n` : "") +
            (safeFolder ? `• <b>Folder:</b> <code>${safeFolder}</code>\n` : "") +
            (safeUploader ? `• <b>Uploader:</b> 👤 <b>${safeUploader}</b>\n` : "") +
            (safeInfo ? `• <b>Info:</b> 📝 <i>${safeInfo}</i>\n` : "") +
            `• <b>Size:</b> ${params.sizeKb || 0} KB` +
            (params.savedKb ? ` (Saved ${params.savedKb} KB)\n` : `\n`) +
            (params.publicUrl ? `• <b>URL:</b> <a href="${safeUrl}">View Asset</a>` : "");
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
          (params.publicUrl ? `• <b>URL:</b> <a href="${safeUrl}">View Asset</a>` : "");
        break;

      case "ASSET_SOFT_DELETED":
        text = `🟡 <b>Media Asset Moved to Trash (Soft Delete)</b>\n` +
          `• <b>App:</b> ${appName}\n` +
          `• <b>Asset ID:</b> <code>${id}</code>\n` +
          (safeTitle ? `• <b>Title:</b> ${safeTitle}\n` : "") +
          (safeFolder ? `• <b>Folder:</b> <code>${safeFolder}</code>\n` : "") +
          (safeUploader ? `• <b>Uploader:</b> 👤 ${safeUploader}\n` : "") +
          (safeInfo ? `• <b>Info:</b> 📝 <i>${safeInfo}</i>\n` : "") +
          `• <b>Status:</b> ⏳ <i>Retained in Trash for 30 days (Recoverable)</i>\n` +
          (params.publicUrl
            ? isAudio
              ? `• <b>Preview Audio:</b> <a href="${safeUrl}">Listen Audio</a>`
              : `• <b>Preview Asset:</b> <a href="${safeUrl}">View Asset</a>`
            : "");
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
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      }
    );

    const result = await res.json();
    if (res.ok && result.ok) return { messageId: String(result.result.message_id) };
    return { error: `Telegram HTTP ${res.status}: ${String(result.description || "Unknown failure").slice(0, 300)}`, retryAfter: result.parameters?.retry_after };
  } catch (err) {
    return { error: err instanceof Error ? err.name : "Telegram transport failure" };
  }
}


/** Enqueue with the caller's transaction to commit the asset and event together. */
export async function enqueueTelegramNotification(executor: Pick<typeof db, "execute">, params: TelegramNotificationParams) {
  const eventKey = params.eventKey || crypto.randomUUID();
  await executor.execute(sql`INSERT INTO telegram_outbox (event_key, payload) VALUES (${eventKey}, ${JSON.stringify(params)}::jsonb) ON CONFLICT (event_key) DO NOTHING`);
  return eventKey;
}

export async function sendTelegramNotification(params: TelegramNotificationParams): Promise<boolean> {
  const eventKey = await enqueueTelegramNotification(db, params);
  await drainTelegramOutbox(1).catch(() => {});
  const result = await db.execute(sql`SELECT status FROM telegram_outbox WHERE event_key = ${eventKey}`);
  return result.rows[0]?.status === "sent";
}

export async function drainTelegramOutbox(limit = 20, onlyId?: string) {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < Math.min(limit, 50); i++) {
    // A global advisory lock plus a persisted cooldown serializes delivery to the chat.
    const claimed = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(728192003)`);
      const result = await tx.execute(sql`UPDATE telegram_outbox SET status = 'sending', attempts = attempts + 1, lease_until = now() + interval '60 seconds'
        WHERE id = (SELECT id FROM telegram_outbox WHERE
          ((status = 'pending' AND next_attempt_at <= now()) OR (status = 'sending' AND lease_until < now()))
          AND (${onlyId || null}::uuid IS NULL OR id = ${onlyId || null}::uuid)
          AND NOT EXISTS (SELECT 1 FROM telegram_outbox WHERE status = 'sending' AND lease_until >= now())
          AND NOT EXISTS (SELECT 1 FROM telegram_outbox WHERE last_error LIKE 'Telegram HTTP 429:%' AND next_attempt_at > now())
          AND NOT EXISTS (SELECT 1 FROM telegram_outbox WHERE sent_at > now() - interval '1 second')
          ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`);
      return result.rows[0];
    });
    if (!claimed) break;
    const outcome = await dispatchTelegramNotification(claimed.payload as unknown as TelegramNotificationParams);
    if (outcome.messageId) {
      await db.execute(sql`UPDATE telegram_outbox SET status = 'sent', sent_at = now(), message_id = ${outcome.messageId}, last_error = NULL, lease_until = NULL WHERE id = ${claimed.id as string}::uuid`);
      sent++;
      if (i + 1 < limit) await new Promise((resolve) => setTimeout(resolve, 1100));
    } else {
      const attempts = Number(claimed.attempts);
      const delay = Math.max(outcome.disabled ? 3600 : outcome.retryAfter || 0, Math.min(3600, 2 ** Math.min(attempts, 10) * 5));
      const status = !outcome.disabled && attempts >= 10 ? "failed" : "pending";
      await db.execute(sql`UPDATE telegram_outbox SET status = ${status}, attempts = attempts - ${outcome.disabled ? 1 : 0}, next_attempt_at = now() + ${delay} * interval '1 second', lease_until = NULL, last_error = ${outcome.disabled ? "Notifications disabled or credentials missing" : outcome.error || "Unknown delivery failure"} WHERE id = ${claimed.id as string}::uuid`);
      failed++;
    }
  }
  return { sent, failed };
}
