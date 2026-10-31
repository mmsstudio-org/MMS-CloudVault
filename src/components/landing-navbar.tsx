"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ExternalLink,
  Menu,
  X,
  Layers,
  Sparkles,
  Code2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile drawer on route click or window resize
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 sm:gap-3 group shrink-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-border bg-black flex items-center justify-center shadow-xs group-hover:scale-105 transition">
            <Image
              src="/logo.png"
              alt="MMS Studio Logo"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm tracking-tight text-foreground">
                MMS Studio
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Storage
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono hidden xs:block">
              Media Delivery Infrastructure
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (>= md) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
          <a
            href="#features"
            className="hover:text-foreground transition"
          >
            Features
          </a>
          <a
            href="#architecture"
            className="hover:text-foreground transition"
          >
            Architecture
          </a>
          <Link
            href="/api-docs"
            className="hover:text-foreground transition flex items-center gap-1"
          >
            <span>Swagger API</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </Link>
          <a
            href="https://studio.sabbirmms.com"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-500 hover:underline flex items-center gap-1"
          >
            <span>Main Portfolio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </nav>

        {/* Desktop Actions (>= sm) */}
        <div className="hidden sm:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow-xs cursor-pointer shrink-0"
          >
            <span>Admin Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Action Controls (< sm) */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 text-foreground" />
            ) : (
              <Menu className="w-4 h-4 text-foreground" />
            )}
          </button>
        </div>

        {/* Tablet Hamburger (sm to md) */}
        <div className="hidden sm:flex md:hidden items-center ml-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 text-foreground" />
            ) : (
              <Menu className="w-4 h-4 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-xl animate-in slide-in-from-top-2 fade-in duration-150 px-4 py-5 shadow-xl space-y-4">
          <nav className="flex flex-col space-y-1 text-sm font-medium">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-foreground hover:bg-muted transition"
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Features
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">Highlights</span>
            </a>

            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-foreground hover:bg-muted transition"
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-cyan-500" />
                Architecture
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">Infra</span>
            </a>

            <Link
              href="/api-docs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-foreground hover:bg-muted transition"
            >
              <span className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-purple-500" />
                Swagger API Playground
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-semibold">
                Live Specs
              </span>
            </Link>

            <a
              href="https://studio.sabbirmms.com"
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition"
            >
              <span className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4" />
                Main Studio Portfolio
              </span>
              <span className="text-[11px] font-mono">studio.sabbirmms.com</span>
            </a>
          </nav>

          {/* Primary Action Button inside Drawer */}
          <div className="pt-2 border-t border-border space-y-2">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition"
            >
              <span>Access Admin Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-[11px] text-center text-muted-foreground font-mono pt-1">
              Protected by NextAuth Google OAuth & 2FA
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
