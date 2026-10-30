"use client";

import * as React from "react";
import Image from "next/image";
import { ShieldCheck, QrCode, X, Loader2, CheckCircle2 } from "lucide-react";
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
        toast.success("Two-Factor Authentication is now active!");
        setTimeout(() => setIsOpen(false), 2000);
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
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-xs"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>2FA Security</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Setup Google Authenticator
                  </h3>
                  <p className="text-[11px] text-zinc-400">TOTP 2FA Protection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
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
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  2FA Activated!
                </p>
                <p className="text-xs text-zinc-500">
                  Your administrator account is now protected with Two-Factor Authentication.
                </p>
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
                    <code className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg select-all">
                      {secret}
                    </code>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                    className="w-full text-center py-2.5 px-3 text-lg font-mono font-bold tracking-widest rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400"
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
