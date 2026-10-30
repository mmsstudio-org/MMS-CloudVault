"use client";

import * as React from "react";
import Image from "next/image";
import {
  Sliders,
  BellRing,
  Shield,
  Send,
  Plus,
  Trash2,
  Lock,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";
import { SiteSettings } from "@/db/schema";
import {
  actionUpdateSiteSettings,
  actionSendTestTelegram,
} from "@/lib/dashboard-actions";
import { toast } from "sonner";

interface SettingsFormProps {
  initialSettings?: SiteSettings;
  userEmail: string;
}

export function SettingsForm({ initialSettings, userEmail }: SettingsFormProps) {
  // Image Capping
  const [maxDimensionPx, setMaxDimensionPx] = React.useState(
    initialSettings?.maxDimensionPx || 2048
  );
  const [maxFileKb, setMaxFileKb] = React.useState(
    initialSettings?.maxFileKb || 1024
  );
  const [compressionQuality, setCompressionQuality] = React.useState(
    initialSettings?.compressionQuality || 80
  );

  // Telegram Notifications
  const [telegramBotToken, setTelegramBotToken] = React.useState(
    initialSettings?.telegramBotToken || ""
  );
  const [telegramChatId, setTelegramChatId] = React.useState(
    initialSettings?.telegramChatId || ""
  );
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] =
    React.useState(initialSettings?.telegramNotificationsEnabled || false);
  const [isTestingTelegram, setIsTestingTelegram] = React.useState(false);

  // SEO & Google Verification
  const [googleSiteVerification, setGoogleSiteVerification] = React.useState(
    initialSettings?.googleSiteVerification || ""
  );
  const [googleSearchConsoleTag, setGoogleSearchConsoleTag] = React.useState(
    initialSettings?.googleSearchConsoleTag || ""
  );

  // Allowed Admin Emails Whitelist
  let defaultEmails: string[] = ["mr.sabbirmms@gmail.com"];
  if (initialSettings?.allowedAdminEmails) {
    try {
      defaultEmails = JSON.parse(initialSettings.allowedAdminEmails);
    } catch {
      defaultEmails = initialSettings.allowedAdminEmails
        .split(",")
        .map((s) => s.trim());
    }
  }
  const [allowedEmails, setAllowedEmails] = React.useState<string[]>(defaultEmails);
  const [newEmail, setNewEmail] = React.useState("");

  // Saving state
  const [isSaving, setIsSaving] = React.useState(false);

  // 2FA Setup State
  const [show2FAModal, setShow2FAModal] = React.useState(false);
  const [totpQrUrl, setTotpQrUrl] = React.useState("");
  const [totpSecret, setTotpSecret] = React.useState("");
  const [totpCode, setTotpCode] = React.useState("");
  const [isVerifying2FA, setIsVerifying2FA] = React.useState(false);

  const handleAddEmail = () => {
    const clean = newEmail.toLowerCase().trim();
    if (!clean || !clean.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (allowedEmails.includes(clean)) {
      toast.error("Email is already in whitelist.");
      return;
    }
    setAllowedEmails([...allowedEmails, clean]);
    setNewEmail("");
    toast.success(`Added '${clean}' to whitelist.`);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    if (emailToRemove === "mr.sabbirmms@gmail.com") {
      toast.error("The root superadmin email cannot be removed.");
      return;
    }
    setAllowedEmails(allowedEmails.filter((e) => e !== emailToRemove));
    toast.info(`Removed '${emailToRemove}' from whitelist.`);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await actionUpdateSiteSettings({
        maxDimensionPx: Number(maxDimensionPx),
        maxFileKb: Number(maxFileKb),
        compressionQuality: Number(compressionQuality),
        telegramBotToken,
        telegramChatId,
        telegramNotificationsEnabled,
        googleSiteVerification,
        googleSearchConsoleTag,
        allowedAdminEmails: allowedEmails,
      });
      toast.success("Site configuration and security settings updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toast.error("Please enter both Bot Token and Chat ID first.");
      return;
    }
    try {
      setIsTestingTelegram(true);
      const ok = await actionSendTestTelegram();
      if (ok) {
        toast.success("Test notification dispatched to Telegram!");
      } else {
        toast.error("Telegram API rejected test message. Check token & chat ID.");
      }
    } catch {
      toast.error("Failed to dispatch Telegram test message.");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleStart2FA = async () => {
    try {
      setShow2FAModal(true);
      // Fetch dynamic setup from API
      const res = await fetch("/api/v1/auth/2fa/setup");
      const data = await res.json();
      if (data.qrCodeDataUrl) {
        setTotpQrUrl(data.qrCodeDataUrl);
        setTotpSecret(data.secret);
      }
    } catch {
      toast.error("Could not generate 2FA QR code.");
    }
  };

  const handleVerify2FA = async () => {
    if (totpCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    try {
      setIsVerifying2FA(true);
      const res = await fetch("/api/v1/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: totpSecret, token: totpCode }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Two-Factor Authentication activated successfully!");
        setShow2FAModal(false);
      } else {
        toast.error(data.error || "Invalid 6-digit code.");
      }
    } catch {
      toast.error("2FA verification failed.");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-8">
      {/* 1. Sharp Image Optimization & Capping Rules */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Sharp Image Capping & Optimization Engine
            </h2>
            <p className="text-xs text-zinc-500">
              Global resolution limits, compression quality, and file size ceilings applied to all incoming uploads.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Max Dimension */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Max Dimension (Pixels)
            </label>
            <input
              type="number"
              min={400}
              max={8000}
              step={64}
              value={maxDimensionPx}
              onChange={(e) => setMaxDimensionPx(Number(e.target.value))}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-white focus:outline-none"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Auto aspect-ratio preserved scaling. Large photos are proportionally fitted.
            </span>
          </div>

          {/* Max File KB */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Max File Size (Kilobytes)
            </label>
            <input
              type="number"
              min={50}
              max={15000}
              step={50}
              value={maxFileKb}
              onChange={(e) => setMaxFileKb(Number(e.target.value))}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-white focus:outline-none"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Iterative compression trims files to stay under this ceiling.
            </span>
          </div>

          {/* Compression Quality */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                WebP Compression Quality
              </label>
              <span className="text-xs font-mono font-bold text-emerald-500">
                {compressionQuality}%
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              value={compressionQuality}
              onChange={(e) => setCompressionQuality(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Optimal sweet spot: 75% - 85% for crisp graphics with minimal weight.
            </span>
          </div>
        </div>
      </div>

      {/* 2. Telegram Webhook Alert System */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Telegram Webhook Alerts
              </h2>
              <p className="text-xs text-zinc-500">
                Real-time push notifications when mobile apps upload or replace assets.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={telegramNotificationsEnabled}
              onChange={(e) => setTelegramNotificationsEnabled(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded"
            />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Enable Alerts
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Telegram Bot Token
            </label>
            <input
              type="password"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRstuVWxYZ"
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Telegram Chat ID / Channel ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. -1001234567890 or @your_channel"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTelegram}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isTestingTelegram ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Test</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Google Site Verification & SEO */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Google Site Verification & Search Console
            </h2>
            <p className="text-xs text-zinc-500">
              Configure search crawler verification keys and brand validation tokens.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Google Site Verification Token
            </label>
            <input
              type="text"
              value={googleSiteVerification}
              onChange={(e) => setGoogleSiteVerification(e.target.value)}
              placeholder="e.g. google-site-verification=abc123xyz"
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Google Search Console Meta Tag
            </label>
            <input
              type="text"
              value={googleSearchConsoleTag}
              onChange={(e) => setGoogleSearchConsoleTag(e.target.value)}
              placeholder='<meta name="google-site-verification" content="..." />'
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Strict Administrator Whitelist */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Authorized Administrator Whitelist
            </h2>
            <p className="text-xs text-zinc-500">
              Strict gatekeeping: Google accounts not listed below are rejected immediately at sign-in time with zero user creation.
            </p>
          </div>
        </div>

        {/* Add Email Bar */}
        <div className="flex gap-2 max-w-md">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new.admin@gmail.com"
            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddEmail}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Whitelist</span>
          </button>
        </div>

        {/* Email Pills List */}
        <div className="flex flex-wrap gap-2 pt-1">
          {allowedEmails.map((email) => {
            const isRoot = email === "mr.sabbirmms@gmail.com";
            return (
              <div
                key={email}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-medium text-zinc-800 dark:text-zinc-200"
              >
                <span>{email}</span>
                {isRoot ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-400 font-semibold uppercase">
                    Root Superadmin
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    className="text-zinc-400 hover:text-red-500 transition cursor-pointer"
                    title="Remove Email from Whitelist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. TOTP Two-Factor Authentication Setup Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              Google Authenticator 2FA (TOTP)
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Enhanced Security
            </span>
          </div>
          <p className="text-xs text-zinc-500 max-w-xl">
            Protect your administrator account with hardware or mobile-based TOTP verification codes.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStart2FA}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <QrCode className="w-4 h-4 text-emerald-500" />
          <span>Setup 2FA Authenticator</span>
        </button>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 z-20 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xl transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save All Settings</span>
        </button>
      </div>

      {/* 2FA Setup Modal Dialog */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Scan with Google Authenticator
            </h3>

            {totpQrUrl ? (
              <div className="p-3 bg-white rounded-xl border border-zinc-200 flex items-center justify-center">
                <Image
                  src={totpQrUrl}
                  alt="2FA QR Code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                  unoptimized
                />
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-3 py-2 text-center text-sm tracking-widest font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShow2FAModal(false)}
                className="w-1/2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerify2FA}
                disabled={isVerifying2FA || totpCode.length !== 6}
                className="w-1/2 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {isVerifying2FA ? "Verifying..." : "Confirm & Enable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
