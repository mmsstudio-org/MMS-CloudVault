import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  isUserTwoFactorEnabled,
  verify2FaSessionToken,
  TWO_FACTOR_COOKIE_NAME,
} from "@/lib/totp";
import { ThemeToggle } from "@/components/theme-toggle";
import { TwoFactorChallenge } from "@/components/two-factor-challenge";

export const metadata = {
  title: "Two-Factor Verification | MMS CloudVault",
  description: "Enter your Google Authenticator code to access MMS CloudVault.",
};

export const dynamic = "force-dynamic";

interface VerifyTwoFactorPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function VerifyTwoFactorPage({
  searchParams,
}: VerifyTwoFactorPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl || "/dashboard";

  // 1. If not authenticated at all, redirect to primary sign-in page
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 2. If user does NOT have 2FA enabled, no challenge is needed! Send to dashboard directly
  const is2FaEnabled = await isUserTwoFactorEnabled(session.user.email);
  if (!is2FaEnabled) {
    redirect(callbackUrl);
  }

  // 3. If user has already verified 2FA for this active session, proceed directly
  const cookieStore = await cookies();
  const twoFactorCookie = cookieStore.get(TWO_FACTOR_COOKIE_NAME)?.value;
  const isVerified = await verify2FaSessionToken(
    twoFactorCookie,
    session.user.email
  );
  if (isVerified) {
    redirect(callbackUrl);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Bar Header */}
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
          </div>
        </div>
      </header>

      {/* Main 2FA Verification Container */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 sm:py-16 flex items-center justify-center">
        <TwoFactorChallenge
          email={session.user.email}
          name={session.user.name || "Administrator"}
          image={session.user.image || "/logo.png"}
          callbackUrl={callbackUrl}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-zinc-500 font-mono">
        MMS Studio CloudVault &bull; Dynamic S3 Multi-Bucket Infrastructure &bull; 2FA Secured
      </footer>
    </div>
  );
}
