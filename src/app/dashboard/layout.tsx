import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  isUserTwoFactorEnabled,
  verify2FaSessionToken,
  TWO_FACTOR_COOKIE_NAME,
} from "@/lib/totp";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardNavProvider } from "@/components/dashboard-nav-context";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // 2FA Security Gate:
  // If user has enabled 2FA, enforce that their active session has verified the 2FA challenge
  const is2FaEnabled = await isUserTwoFactorEnabled(session.user.email);
  if (is2FaEnabled) {
    const cookieStore = await cookies();
    const twoFactorCookie = cookieStore.get(TWO_FACTOR_COOKIE_NAME)?.value;
    const isVerified = await verify2FaSessionToken(
      twoFactorCookie,
      session.user.email
    );
    if (!isVerified) {
      redirect("/login/verify-2fa");
    }
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: (session.user as unknown as { role?: string })?.role || "admin",
  };

  return (
    <DashboardNavProvider>
      <div className="min-h-screen bg-background flex flex-row">
        {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
        <DashboardSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader user={user} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 container w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </DashboardNavProvider>
  );
}
