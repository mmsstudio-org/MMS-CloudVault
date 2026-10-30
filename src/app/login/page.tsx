import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Shield, Lock, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/components/login-form";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export const metadata = {
  title: "Admin Portal Sign In",
  description: "Secure administrator authentication for MMS Studio Storage.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Homepage
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Logo & Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-black items-center justify-center shadow-md">
              <Image
                src="/logo.png"
                alt="MMS Studio Logo"
                width={56}
                height={56}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                MMS Studio Storage
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Administrative Media & Asset Management Portal
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5" />
              Whitelisted Admin Access Only
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Access Blocked</p>
                <p className="mt-0.5">
                  {error === "AccessDenied"
                    ? "Your Google account is not on the authorized administrators whitelist. Zero tokens or accounts were generated."
                    : `Authentication failed: ${error}`}
                </p>
              </div>
            </div>
          )}

          {/* Interactive Login Form */}
          <LoginForm callbackUrl={params?.callbackUrl} />

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center space-y-2">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              256-bit encrypted authentication & Google OAuth 2.0
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-zinc-900 dark:hover:text-white">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-zinc-900 dark:hover:text-white">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
        MMS Studio Media Infrastructure •{" "}
        <a
          href="https://studio.sabbirmms.com"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          studio.sabbirmms.com
        </a>
      </footer>
    </div>
  );
}
