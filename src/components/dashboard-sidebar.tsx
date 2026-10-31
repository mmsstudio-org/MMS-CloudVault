"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Images,
  UploadCloud,
  KeyRound,
  Trash2,
  Settings,
  BookOpen,
  ExternalLink,
  X,
} from "lucide-react";
import { useDashboardNav } from "./dashboard-nav-context";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Asset Gallery",
    href: "/dashboard/gallery",
    icon: Images,
  },
  {
    label: "Manual Upload",
    href: "/dashboard/upload",
    icon: UploadCloud,
  },
  {
    label: "API Keys",
    href: "/dashboard/api-keys",
    icon: KeyRound,
  },
  {
    label: "Trash Bin",
    href: "/dashboard/trash",
    icon: Trash2,
  },
  {
    label: "Site Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, closeSidebar } = useDashboardNav();

  // Close mobile drawer when route changes
  React.useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSidebar]);

  // Sidebar content (shared between desktop and mobile drawer)
  const renderSidebarContent = (isMobile = false) => (
    <>
      {/* Brand Logo & Title */}
      <div className="h-16 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <Link
          href="/"
          onClick={isMobile ? closeSidebar : undefined}
          className="flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-black flex items-center justify-center shrink-0 shadow-xs">
            <Image
              src="/logo.png"
              alt="MMS Studio Logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block text-zinc-900 dark:text-white">
              MMS Studio
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase block">
              Storage Engine
            </span>
          </div>
        </Link>

        {isMobile && (
          <button
            type="button"
            onClick={closeSidebar}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Platform Menu
        </div>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={isMobile ? closeSidebar : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Resources
        </div>

        <Link
          href="/api-docs"
          target="_blank"
          onClick={isMobile ? closeSidebar : undefined}
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition"
        >
          <span className="flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Swagger API Docs</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </Link>

        <a
          href="https://studio.sabbirmms.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition"
        >
          <span className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Studio Portfolio</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </a>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="rounded-xl p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span>Storage Status</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            Sharp 0.35 + Neon Postgres
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar (>= lg) */}
      <aside className="hidden lg:flex w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-col shrink-0 h-screen sticky top-0 transition-colors">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Drawer Overlay & Slide-In Panel (< lg) */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeSidebar}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-zinc-950 shadow-2xl flex flex-col border-r border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-left duration-200"
            aria-label="Mobile Navigation"
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
