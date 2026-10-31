"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export function LoginForm({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [isCredLoading, setIsCredLoading] = React.useState(false);
  const [showDevLogin, setShowDevLogin] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [passcode, setPasscode] = React.useState("");

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      try {
        await fetch("/api/v1/auth/2fa/logout", { method: "POST" });
      } catch {}
      await signIn("google", { callbackUrl });
    } catch {
      toast.error("Failed to initiate Google Sign In.");
      setIsGoogleLoading(false);
    }
  };

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCredLoading(true);
      try {
        await fetch("/api/v1/auth/2fa/logout", { method: "POST" });
      } catch {}
      const res = await signIn("admin-quick-login", {
        email,
        passcode,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        toast.error("Invalid credentials or email not whitelisted.");
        setIsCredLoading(false);
      } else {
        toast.success("Welcome back, Administrator!");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("Sign in failed. Check your credentials.");
      setIsCredLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isCredLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white shadow-sm transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span>Sign in with Google</span>
      </button>

      {/* Dev / Quick Access Collapsible (Development Mode Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDevLogin(!showDevLogin)}
            className="w-full flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              Developer / Local Quick Access
            </span>
            {showDevLogin ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showDevLogin && (
            <form
              onSubmit={handleDevSignIn}
              className="mt-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-3"
            >
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                <span className="font-semibold block">Local Dev Quick Credentials:</span>
                Email: <code className="font-mono font-bold">mr.sabbirmms@gmail.com</code>
                <br />
                Passcode: <code className="font-mono font-bold">admin123</code>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Whitelisted Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-500 font-mono"
                  placeholder="mr.sabbirmms@gmail.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  Admin Passcode
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-500 font-mono"
                  placeholder="admin123"
                />
              </div>

              <button
                type="submit"
                disabled={isCredLoading}
                className="w-full py-2 px-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isCredLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Sign In as Administrator
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
