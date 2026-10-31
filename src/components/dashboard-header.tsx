"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { LogOut, Menu, User } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useDashboardNav } from "./dashboard-nav-context";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const isSuper = user.role === "superadmin";
  const { toggleSidebar } = useDashboardNav();

  return (
    <header className="h-16 px-4 sm:px-6 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground hover:bg-muted transition cursor-pointer shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground line-clamp-1">
            Admin Operations Hub
          </h2>
          <p className="text-[11px] text-muted-foreground hidden xs:block line-clamp-1">
            MMS Studio Centralized Media Delivery
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                width={32}
                height={32}
                className="object-cover"
                unoptimized
              />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          <div className="hidden sm:block text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground line-clamp-1">
                {user.name || "Administrator"}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                  isSuper
                    ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                    : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                }`}
              >
                {user.role || "Admin"}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground block line-clamp-1">
              {user.email}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={async () => {
              try {
                await fetch("/api/v1/auth/2fa/logout", { method: "POST" });
              } catch {}
              await signOut({ callbackUrl: "/login" });
            }}
            title="Sign out of Admin Portal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-status-danger-bg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
