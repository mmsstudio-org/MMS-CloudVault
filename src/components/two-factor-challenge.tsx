"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ShieldCheck, Loader2, AlertCircle, LogOut, ArrowRight, Smartphone } from "lucide-react";
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
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(rawVal);
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
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid 6-digit code. Please check your Authenticator app and try again.");
        setIsLoading(false);
        inputRef.current?.focus();
        return;
      }

      toast.success("Two-Factor Authentication verified successfully!");
      // Redirect to target dashboard page
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Network or verification error. Please check your internet and try again.");
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
    <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Brand & Security Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 items-center justify-center shadow-xs">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Two-Factor Authentication
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Google Authenticator Verification Required
          </p>
        </div>
      </div>

      {/* Authenticated User Identity Pill */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
        <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-black shrink-0 relative">
          <Image
            src={image || "/logo.png"}
            alt={name || "Administrator"}
            fill
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
            {name || "Administrator"}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
            {email}
          </p>
        </div>
        <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
          2FA Active
        </span>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {/* 2FA Input Form */}
      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="totp-code"
              className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
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
              className="w-full text-center text-2xl font-mono tracking-[0.35em] sm:tracking-[0.5em] py-3.5 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition disabled:opacity-50"
            />
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 text-center leading-relaxed">
            Open the <strong>Google Authenticator</strong> app on your mobile device and enter the dynamic 6-digit code for <strong>MMS CloudVault</strong>.
          </p>
        </div>

        {/* Submit Verification Button */}
        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Authenticator Code...</span>
            </>
          ) : (
            <>
              <span>Verify & Access Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch Account or Cancel */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition py-1 cursor-pointer font-medium disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>
    </div>
  );
}
