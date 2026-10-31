"use client";

import * as React from "react";
import Image from "next/image";
import {
  ShieldCheck,
  QrCode,
  X,
  Loader2,
  CheckCircle2,
  Copy,
  Download,
} from "lucide-react";
import { toast } from "sonner";

export function TwoFactorDialog({
  triggerButton,
}: {
  triggerButton?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [qrCodeUrl, setQrCodeUrl] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [code, setCode] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);

  const handleOpen = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setIsSuccess(false);
    setCode("");
    try {
      const res = await fetch("/api/v1/auth/2fa/setup");
      const data = await res.json();
      if (data.qrCodeDataUrl) {
        setQrCodeUrl(data.qrCodeDataUrl);
        setSecret(data.secret);
      } else {
        toast.error("Failed to generate 2FA QR code.");
      }
    } catch {
      toast.error("Network error while setting up 2FA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code from Google Authenticator.");
      return;
    }

    try {
      setIsVerifying(true);
      const res = await fetch("/api/v1/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, token: code }),
      });
      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
        if (Array.isArray(data.recoveryCodes) && data.recoveryCodes.length > 0) {
          setRecoveryCodes(data.recoveryCodes);
        }
        toast.success("Two-Factor Authentication is now active!");
      } else {
        toast.error(data.error || "Invalid 6-digit code. Please try again.");
      }
    } catch {
      toast.error("Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      {triggerButton ? (
        <span onClick={handleOpen}>{triggerButton}</span>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer shadow-xs"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>2FA Security</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Setup Google Authenticator
                  </h3>
                  <p className="text-[11px] text-zinc-400">TOTP 2FA Protection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="h-60 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-xs">Generating QR Code...</span>
              </div>
            ) : isSuccess ? (
              <div className="py-2 space-y-4">
                <div className="text-center space-y-1">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-foreground">
                    2FA Successfully Activated!
                  </p>
                  <p className="text-xs text-zinc-500">
                    Save these one-time recovery codes in a secure place. If you lose access to your Authenticator app, you can use these to sign in.
                  </p>
                </div>

                {recoveryCodes.length > 0 && (
                  <div className="p-3 bg-background/60 rounded-2xl border border-border space-y-3">
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs font-bold text-foreground text-center">
                      {recoveryCodes.map((c, i) => (
                        <div
                          key={i}
                          className="bg-card border border-border py-1.5 px-2 rounded-lg tracking-wider"
                        >
                          {c}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(recoveryCodes.join("\n"));
                          toast.success("Recovery codes copied to clipboard!");
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const text = `MMS Studio Storage - 2FA Emergency Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${recoveryCodes.join("\n")}\n\nKeep these codes safe and confidential. Each code can be used once.`;
                          const blob = new Blob([text], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `mms-storage-recovery-codes-${Date.now()}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success("Downloaded recovery codes file.");
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <p className="text-xs text-zinc-500">
                  Scan this QR code using <strong>Google Authenticator</strong> or any TOTP app:
                </p>

                {qrCodeUrl && (
                  <div className="p-3 bg-white rounded-2xl border border-zinc-200 flex items-center justify-center max-w-[200px] mx-auto shadow-sm">
                    <Image
                      src={qrCodeUrl}
                      alt="TOTP QR Code"
                      width={180}
                      height={180}
                      className="rounded-lg"
                      unoptimized
                    />
                  </div>
                )}

                {secret && (
                  <div className="text-center">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">Manual key code:</span>
                    <code className="text-xs font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded-lg select-all">
                      {secret}
                    </code>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                    className="w-full text-center py-2.5 px-3 text-lg font-mono font-bold tracking-widest rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying || code.length !== 6}
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Activate</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
