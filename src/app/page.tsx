import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  HardDrive,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Lock,
  Layers,
  Sparkles,
  Database,
  Cloud,
} from "lucide-react";
import { LandingNavbar } from "@/components/landing-navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Notification Banner */}
      <div className="bg-zinc-900 text-zinc-300 text-xs py-2 px-4 border-b border-zinc-800 text-center flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-zinc-300">
          A dedicated sub-system of <strong>MMS Studio</strong>. Looking for our creative agency?
        </span>
        <a
          href="https://studio.sabbirmms.com"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1 ml-1 shrink-0"
        >
          Visit studio.sabbirmms.com <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Main Responsive Navigation Bar */}
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Ambient Gradient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            High-Performance Media & Asset Pipeline for Mobile Apps
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Serverless Object Storage <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Engineered for Instant Media Delivery
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
            MMS CloudVault empowers applications, web apps, and media creators with on-the-fly Sharp WebP optimization, aspect-ratio scaling, in-memory API key caching, and automatic deduplication.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <span>Access Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/api-docs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition shadow-xs cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Interactive Swagger API Docs</span>
            </Link>

            <a
              href="https://studio.sabbirmms.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              <span>About MMS Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-card border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">Image Optimization</span>
              <p className="text-xl font-bold text-foreground mt-1">Sharp + WebP</p>
              <p className="text-[10px] text-emerald-500 font-medium mt-0.5">Iterative size trimming</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">Deduplication</span>
              <p className="text-xl font-bold text-foreground mt-1">App + Asset ID</p>
              <p className="text-[10px] text-purple-500 font-medium mt-0.5">Auto storage recycling</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">Read Delivery</span>
              <p className="text-xl font-bold text-foreground mt-1">Zero DB Load</p>
              <p className="text-[10px] text-sky-500 font-medium mt-0.5">Direct Cloudflare R2 / S3</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">Security Gate</span>
              <p className="text-xl font-bold text-foreground mt-1">Whitelist 2FA</p>
              <p className="text-[10px] text-amber-500 font-medium mt-0.5">Google OAuth & TOTP</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Architecture Section */}
      <section id="features" className="py-20 border-t border-border bg-muted/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Built for Scale, Reliability & Cost Efficiency
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Engineered to replace fragile Firebase storage with modern, developer-controlled media pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Automatic Aspect-Ratio Scaling
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Images are automatically analyzed in memory. If larger than the defined Max Dimensions, they scale proportionally without letterboxing or distortion.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Intelligent Replacement Engine
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When a media asset is updated from your app, the old physical storage object is permanently deleted and replaced instantly, preventing storage bloat.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Direct Cloudflare R2 / S3 Delivery
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Client devices fetch assets directly from the high-speed CDN. Your Next.js server and PostgreSQL database experience 0% strain on media views.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                0.03ms In-Memory Key Caching
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                High-throughput mobile apps validate their <code className="text-[11px] font-mono">x-api-key</code> in microseconds using LRU caching without touching the database.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Strict Whitelist Gatekeeping
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Only pre-authorized Google emails configured in the dashboard settings are permitted to log in. Unauthorized access attempts are rejected instantly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                30-Day Trash & Auto-Purge
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Deleted files are retained safely for 30 days before scheduled cron garbage collection, allowing one-click accidental deletion recovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Showcase */}
      <section id="architecture" className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              End-to-End Media Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Clean separation of concerns between write ingestion and high-speed public CDN delivery.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 text-white border border-zinc-800 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700">
                <span className="text-[11px] font-mono text-emerald-400 block mb-1">Step 1</span>
                <p className="text-xs font-bold">Client Upload</p>
                <p className="text-[11px] text-zinc-400 mt-1">x-api-key + Asset ID</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700">
                <span className="text-[11px] font-mono text-emerald-400 block mb-1">Step 2</span>
                <p className="text-xs font-bold">Sharp Engine</p>
                <p className="text-[11px] text-zinc-400 mt-1">Aspect Scale & WebP</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700">
                <span className="text-[11px] font-mono text-emerald-400 block mb-1">Step 3</span>
                <p className="text-xs font-bold">Deduplication</p>
                <p className="text-[11px] text-zinc-400 mt-1">Recycle Old Storage</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700">
                <span className="text-[11px] font-mono text-emerald-400 block mb-1">Step 4</span>
                <p className="text-xs font-bold">Public CDN Link</p>
                <p className="text-[11px] text-zinc-400 mt-1">Direct Edge Serving</p>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <p className="text-xs font-bold text-white">Ready to test via Swagger?</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Try live API requests directly in your browser with full parameter specifications.
                </p>
              </div>
              <Link
                href="/api-docs"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs transition shrink-0"
              >
                Open Swagger UI
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Rich Footer */}
      <footer className="border-t border-border bg-background py-12 text-muted-foreground text-xs">
        <div className="container mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-black flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="MMS Studio Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-sm text-foreground">
                MMS CloudVault
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              High-performance, automated media asset ingestion, Sharp optimization pipeline, progressive BlurHash calculation, and Cloudflare R2 / S3 object delivery for modern applications.
            </p>
            <p className="text-[11px] text-zinc-400">
              Developed & operated by{" "}
              <a
                href="https://studio.sabbirmms.com"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                MMS Studio
              </a>
              .
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="hover:text-foreground transition">
                  Swagger OpenAPI Docs
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition">
                  Admin Login
                </Link>
              </li>
              <li>
                <a
                  href="https://studio.sabbirmms.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition inline-flex items-center gap-1"
                >
                  MMS Studio Portfolio <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
              Legal & Verification
            </h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="/api/v1/openapi.json"
                  target="_blank"
                  className="hover:text-foreground transition"
                >
                  Raw OpenAPI 3.0 Spec
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 pt-6 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <p>© 2026 MMS Studio. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Google OAuth Brand Verification Ready
          </p>
        </div>
      </footer>
    </div>
  );
}
