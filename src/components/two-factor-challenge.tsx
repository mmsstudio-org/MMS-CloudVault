"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  LogOut,
  ArrowRight,
  Smartphone,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

interface TwoFactorChallengeProps {
  email: string;
  name: string;
  image?: string;
  callbackUrl?: string;
}

export function TwoFactorChallenge({
  email,
  name,
  image = "/logo.png",
  callbackUrl = "/dashboard",
}: TwoFactorChallengeProps) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [useBackupCode, setUseBackupCode] = React.useState(false);
  const [backupCode, setBackupCode] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const backupInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus input on mount or toggle
  React.useEffect(() => {
    if (useBackupCode) {
      backupInputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [useBackupCode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(rawVal);
    setError(null);
  };

  const handleBackupCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .slice(0, 12);
    setBackupCode(rawVal);
    setError(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      setCode(pasted);
      setError(null);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (useBackupCode) {
      const cleanBackup = backupCode.trim().toUpperCase();
      if (!cleanBackup || cleanBackup.length < 6) {
        setError("Please enter a valid backup recovery code (e.g. XXXX-XXXX).");
        backupInputRef.current?.focus();
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/v1/auth/2fa/login-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: cleanBackup, isBackupCode: true }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(
            data.error ||
              "Invalid backup recovery code or code has already been used."
          );
          setIsLoading(false);
          backupInputRef.current?.focus();
          return;
        }

        toast.success("Backup recovery code verified! Access granted.");
        router.push(callbackUrl);
        router.refresh();
      } catch {
        setError(
          "Network or verification error. Please check your internet and try again."
        );
        setIsLoading(false);
      }
      return;
    }

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      inputRef.current?.focus();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch("/api/v1/auth/2fa/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, isBackupCode: false }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          data.error ||
            "Invalid 6-digit code. Please check your Authenticator app and try again."
        );
        setIsLoading(false);
        inputRef.current?.focus();
        return;
      }

      toast.success("Two-Factor Authentication verified successfully!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(
        "Network or verification error. Please check your internet and try again."
      );
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/v1/auth/2fa/logout", { method: "POST" });
    } catch {}
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Brand & Security Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 items-center justify-center shadow-xs">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Two-Factor Authentication
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Google Authenticator Verification Required
          </p>
        </div>
      </div>

      {/* Authenticated User Identity Pill */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted border border-zinc-200/60 border-border">
        <div className="w-9 h-9 rounded-xl overflow-hidden border border-border bg-black shrink-0 relative">
          <Image
            src={image || "/logo.png"}
            alt={name || "Administrator"}
            fill
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">
            {name || "Administrator"}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono truncate">
            {email}
          </p>
        </div>
        <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
          2FA Active
        </span>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {/* 2FA Input Form */}
      <form onSubmit={handleVerify} className="space-y-5">
        {useBackupCode ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="backup-code"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>Single-Use Backup Recovery Code</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                {backupCode.length}/9
              </span>
            </div>

            <div className="relative">
              <input
                ref={backupInputRef}
                id="backup-code"
                type="text"
                autoComplete="off"
                value={backupCode}
                onChange={handleBackupCodeChange}
                placeholder="XXXX-XXXX"
                disabled={isLoading}
                className="w-full text-center text-xl font-mono tracking-widest py-3.5 px-4 rounded-2xl border border-border bg-muted text-foreground font-bold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition disabled:opacity-50 uppercase"
              />
            </div>

            <p className="text-[11px] text-muted-foreground mt-2 text-center leading-relaxed">
              Enter one of your 8-character single-use emergency recovery codes. Each code can only be used once.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="totp-code"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                <span>Enter 6-Digit Authenticator Code</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                {code.length}/6
              </span>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={handleCodeChange}
                onPaste={handlePaste}
                placeholder="000 000"
                disabled={isLoading}
                className="w-full text-center text-2xl font-mono tracking-[0.35em] sm:tracking-[0.5em] py-3.5 px-4 rounded-2xl border border-border bg-muted text-foreground font-bold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition disabled:opacity-50"
              />
            </div>

            <p className="text-[11px] text-muted-foreground mt-2 text-center leading-relaxed">
              Open the <strong>Google Authenticator</strong> app on your mobile device and enter the dynamic 6-digit code for <strong>MMS CloudVault</strong>.
            </p>
          </div>
        )}

        {/* Mode Toggle Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setError(null);
            }}
            disabled={isLoading}
            className="text-xs text-emerald-500 hover:underline cursor-pointer font-medium disabled:opacity-50"
          >
            {useBackupCode
              ? "← Use Google Authenticator 6-digit code"
              : "Lost your phone? Use a backup recovery code"}
          </button>
        </div>

        {/* Submit Verification Button */}
        <button
          type="submit"
          disabled={
            isLoading ||
            (useBackupCode ? backupCode.trim().length < 6 : code.length !== 6)
          }
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <>
              <span>
                {useBackupCode
                  ? "Verify Backup Code & Access Dashboard"
                  : "Verify & Access Dashboard"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch Account or Cancel */}
      <div className="pt-2 border-t border-border text-center">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-foreground transition py-1 cursor-pointer font-medium disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>
    </div>
  );
}
