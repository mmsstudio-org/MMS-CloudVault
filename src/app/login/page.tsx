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
  description: "Secure administrator authentication for MMS CloudVault.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Bar Navigation */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-sm hover:opacity-80 transition"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-black flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="MMS Studio Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span>MMS CloudVault</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition px-2.5 py-1.5 rounded-lg hover:bg-muted"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 sm:py-16 flex items-center justify-center">
        <div className="w-full max-w-sm sm:max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Logo & Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl overflow-hidden border border-border bg-black items-center justify-center shadow-md">
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
                MMS CloudVault
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Administrative Media & Asset Management Portal
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5" />
              Whitelisted Admin Access Only
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2.5">
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
          <div className="mt-8 pt-6 border-t border-border text-center space-y-2">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              256-bit encrypted authentication & Google OAuth 2.0
            </p>
            <p className="text-[11px] text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 MMS CloudVault. All rights reserved.</p>
          <p>
            MMS Studio Media Infrastructure •{" "}
            <a
              href="https://studio.sabbirmms.com"
              target="_blank"
              rel="noreferrer"
              className="hover:underline hover:text-foreground"
            >
              studio.sabbirmms.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
