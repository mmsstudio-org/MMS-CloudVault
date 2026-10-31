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
  ShieldAlert,
  Loader2,
  Save,
  KeyRound,
  Copy,
  Download,
  RefreshCw,
  X,
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
  initialTwoFactorEnabled?: boolean;
}

export function SettingsForm({
  initialSettings,
  userEmail,
  initialTwoFactorEnabled = false,
}: SettingsFormProps) {
  const [isTwoFactorActive, setIsTwoFactorActive] = React.useState(
    initialTwoFactorEnabled
  );
  const [isDisabling2FA, setIsDisabling2FA] = React.useState(false);
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
  const [showDisable2FAModal, setShowDisable2FAModal] = React.useState(false);
  const [disableConfirmInput, setDisableConfirmInput] = React.useState("");
  const [totpQrUrl, setTotpQrUrl] = React.useState("");
  const [totpSecret, setTotpSecret] = React.useState("");
  const [totpCode, setTotpCode] = React.useState("");
  const [isVerifying2FA, setIsVerifying2FA] = React.useState(false);

  // 2FA Recovery Codes State
  const [showRecoveryCodesModal, setShowRecoveryCodesModal] = React.useState(false);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);
  const [isLoadingRecoveryCodes, setIsLoadingRecoveryCodes] = React.useState(false);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = React.useState(false);
  const [newSetupRecoveryCodes, setNewSetupRecoveryCodes] = React.useState<string[] | null>(null);

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
        setIsTwoFactorActive(true);
        if (data.recoveryCodes && data.recoveryCodes.length > 0) {
          setNewSetupRecoveryCodes(data.recoveryCodes);
        } else {
          setShow2FAModal(false);
        }
      } else {
        toast.error(data.error || "Invalid 6-digit code.");
      }
    } catch {
      toast.error("2FA verification failed.");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleOpenRecoveryCodes = async () => {
    setShowRecoveryCodesModal(true);
    setIsLoadingRecoveryCodes(true);
    try {
      const res = await fetch("/api/v1/auth/2fa/recovery-codes");
      const data = await res.json();
      if (res.ok && data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
      } else {
        toast.error(data.error || "Failed to load recovery codes.");
      }
    } catch {
      toast.error("Network error loading recovery codes.");
    } finally {
      setIsLoadingRecoveryCodes(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    setIsRegeneratingCodes(true);
    try {
      const res = await fetch("/api/v1/auth/2fa/recovery-codes", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
        toast.success("Fresh recovery codes generated! Previous codes were revoked.");
      } else {
        toast.error(data.error || "Failed to regenerate recovery codes.");
      }
    } catch {
      toast.error("Error regenerating recovery codes.");
    } finally {
      setIsRegeneratingCodes(false);
    }
  };

  const copyAllCodes = async (codes: string[]) => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Recovery codes copied to clipboard!");
    } catch {
      toast.error("Failed to copy codes.");
    }
  };

  const downloadCodesAsText = (codes: string[]) => {
    const textContent = `MMS CloudVault 2FA Backup Recovery Codes\nAccount: ${userEmail}\nGenerated: ${new Date().toISOString()}\n\nTreat these codes like your password. Each code can only be used once.\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mms-cloudvault-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recovery codes downloaded (.txt)!");
  };

  const handleDisable2FA = () => {
    setDisableConfirmInput("");
    setShowDisable2FAModal(true);
  };

  const confirmDisable2FA = async () => {
    if (disableConfirmInput.trim().toUpperCase() !== "CONFIRM") {
      toast.error("Please type CONFIRM to proceed with disabling 2FA.");
      return;
    }

    try {
      setIsDisabling2FA(true);
      const res = await fetch("/api/v1/auth/2fa/disable", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsTwoFactorActive(false);
        setShowDisable2FAModal(false);
        setDisableConfirmInput("");
        toast.success("Two-Factor Authentication has been disabled.");
      } else {
        toast.error(data.error || "Failed to disable 2FA.");
      }
    } catch {
      toast.error("Error while disabling 2FA.");
    } finally {
      setIsDisabling2FA(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-8">
      {/* 1. Sharp Image Optimization & Capping Rules */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Sharp Image Capping & Optimization Engine
            </h2>
            <p className="text-xs text-muted-foreground">
              Global resolution limits, compression quality, and file size ceilings applied to all incoming uploads.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Max Dimension */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Max Dimension (Pixels)
            </label>
            <input
              type="number"
              min={64}
              max={4000}
              // step={64}
              value={maxDimensionPx}
              onChange={(e) => setMaxDimensionPx(Number(e.target.value))}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted font-mono text-foreground focus:outline-none"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Auto aspect-ratio preserved scaling. Large photos are proportionally fitted.
            </span>
          </div>

          {/* Max File KB */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Max File Size (Kilobytes)
            </label>
            <input
              type="number"
              min={50}
              max={15000}
              // step={12}
              value={maxFileKb}
              onChange={(e) => setMaxFileKb(Number(e.target.value))}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted font-mono text-foreground focus:outline-none"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Iterative compression trims files to stay under this ceiling.
            </span>
          </div>

          {/* Compression Quality */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground">
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
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Telegram Webhook Alerts
              </h2>
              <p className="text-xs text-muted-foreground">
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
            <span className="text-xs font-semibold text-foreground">
              Enable Alerts
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Telegram Bot Token
            </label>
            <input
              type="password"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRstuVWxYZ"
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted font-mono text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Telegram Chat ID / Channel ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. -1001234567890 or @your_channel"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted font-mono text-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTelegram}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted transition cursor-pointer shrink-0 disabled:opacity-50"
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
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Google Site Verification & Search Console
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure search crawler verification keys and brand validation tokens.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Google Site Verification Token
            </label>
            <input
              type="text"
              value={googleSiteVerification}
              onChange={(e) => setGoogleSiteVerification(e.target.value)}
              placeholder="e.g. google-site-verification=abc123xyz"
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted font-mono text-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Google Search Console Meta Tag
            </label>
            <input
              type="text"
              value={googleSearchConsoleTag}
              onChange={(e) => setGoogleSearchConsoleTag(e.target.value)}
              placeholder='<meta name="google-site-verification" content="..." />'
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted font-mono text-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Strict Administrator Whitelist */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Authorized Administrator Whitelist
            </h2>
            <p className="text-xs text-muted-foreground">
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
            className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-muted text-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddEmail}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer shrink-0"
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted text-xs font-medium text-foreground"
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
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap-reverse items-center gap-2 mb-1">
            <span className="text-sm font-bold text-foreground">
              Google Authenticator 2FA (TOTP)
            </span>
            {isTwoFactorActive ? (
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active & Enforced on Login
              </span>
            ) : (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Disabled / Not Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            {isTwoFactorActive
              ? "Two-Factor Authentication is currently active. Every time you log in, you will be prompted for a 6-digit Google Authenticator code."
              : "Protect your administrator account with hardware or mobile-based TOTP verification codes. When enabled, login will require Authenticator approval."}
          </p>
        </div>

        {isTwoFactorActive ? (
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleOpenRecoveryCodes}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-muted text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-emerald-500" />
              <span>Recovery Codes</span>
            </button>
            <button
              type="button"
              onClick={handleDisable2FA}
              disabled={isDisabling2FA}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-500 hover:bg-red-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isDisabling2FA ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
              <span>Disable 2FA</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStart2FA}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <QrCode className="w-4 h-4 text-emerald-500" />
            <span>Setup 2FA Authenticator</span>
          </button>
        )}
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
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            {newSetupRecoveryCodes ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Save Emergency Recovery Codes
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Emergency backup codes if you lose Authenticator access
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500 leading-relaxed">
                  ⚠️ <strong>Important:</strong> If you lose your phone or Authenticator app, these {newSetupRecoveryCodes.length} codes are the only way to recover access. Each code can be used exactly once.
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-xl border border-border font-mono text-xs font-bold text-foreground">
                  {newSetupRecoveryCodes.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 text-center bg-card rounded-lg border border-border"
                    >
                      {c}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyAllCodes(newSetupRecoveryCodes)}
                    className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCodesAsText(newSetupRecoveryCodes)}
                    className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (.txt)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewSetupRecoveryCodes(null);
                    setShow2FAModal(false);
                    setTotpCode("");
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  I Have Saved My Recovery Codes
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-bold text-foreground">
                  Scan with Google Authenticator
                </h3>

                {totpQrUrl ? (
                  <div className="p-3 bg-white rounded-xl border border-zinc-200 flex items-center justify-center max-w-[220px] mx-auto shadow-sm">
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
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="123456"
                    className="w-full px-3 py-2 text-center text-sm tracking-widest font-mono rounded-xl border border-border bg-muted font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShow2FAModal(false)}
                    className="w-1/2 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerify2FA}
                    disabled={isVerifying2FA || totpCode.length !== 6}
                    className="w-1/2 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    {isVerifying2FA ? "Verifying..." : "Confirm & Enable"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2FA Existing Recovery Codes Modal */}
      {showRecoveryCodesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Emergency Backup Recovery Codes
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {recoveryCodes.length} remaining active single-use codes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecoveryCodesModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingRecoveryCodes ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-xs">Fetching active recovery codes...</span>
              </div>
            ) : recoveryCodes.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-xs font-semibold text-foreground">
                  No active recovery codes found.
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateRecoveryCodes}
                  disabled={isRegeneratingCodes}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  Generate 8 Fresh Codes
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each code can be used once to access your account if you lose your authenticator device.
                </p>

                <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-xl border border-border font-mono text-xs font-bold text-foreground">
                  {recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 text-center bg-card rounded-lg border border-border"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyAllCodes(recoveryCodes)}
                    className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCodesAsText(recoveryCodes)}
                    className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (.txt)</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateRecoveryCodes}
                    disabled={isRegeneratingCodes}
                    className="text-[11px] text-zinc-500 hover:text-red-500 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isRegeneratingCodes ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Generate New Codes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRecoveryCodesModal(false)}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disable 2FA Security Confirmation Modal with CONFIRM Text Requirement */}
      {showDisable2FAModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-red-500/30 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Disable Two-Factor Authentication?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Security Downgrade Warning
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 leading-relaxed space-y-1.5">
              <p className="font-semibold">
                Warning: Disabling 2FA removes secondary hardware verification.
              </p>
              <p className="text-[11px] opacity-90">
                Anyone with access to your Google account will be able to log directly into the MMS CloudVault Admin Portal.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                To proceed, type <span className="font-mono text-red-500 font-bold">CONFIRM</span> below:
              </label>
              <input
                type="text"
                value={disableConfirmInput}
                onChange={(e) => setDisableConfirmInput(e.target.value)}
                placeholder="Type CONFIRM to proceed"
                className="w-full text-center tracking-widest font-mono text-sm py-2.5 px-3 rounded-xl border border-border bg-muted text-foreground font-bold focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDisable2FAModal(false);
                  setDisableConfirmInput("");
                }}
                disabled={isDisabling2FA}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDisable2FA}
                disabled={disableConfirmInput.trim().toUpperCase() !== "CONFIRM" || isDisabling2FA}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDisabling2FA ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Disabling...</span>
                  </>
                ) : (
                  <span>Disable 2FA Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
