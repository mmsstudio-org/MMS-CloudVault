import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, ExternalLink, ShieldCheck, Globe, Cpu, Database } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SwaggerView } from "@/components/swagger-view";
import { PostmanExportButton } from "@/components/postman-export-button";

export const metadata = {
  title: "API Documentation & Interactive Playground | MMS CloudVault",
  description:
    "Interactive OpenAPI specification and live testing playground for MMS CloudVault REST endpoints. Export directly to Postman or test live.",
};

export default function ApiDocsPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col antialiased">
      {/* Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 font-semibold text-sm hover:opacity-80 transition shrink-0"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-black flex items-center justify-center shrink-0 shadow-xs">
              <Image
                src="/logo.png"
                alt="MMS Studio Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="font-bold tracking-tight">
              <span className="hidden sm:inline">MMS </span>CloudVault
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium border border-emerald-500/20 hidden xs:inline-flex">
              API Docs
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 px-1.5 py-1 rounded-lg"
              title="Open Dashboard"
            >
              <span className="hidden sm:inline">Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Back to Homepage"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Back</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-b from-white to-zinc-50/50 dark:from-zinc-900/40 dark:to-zinc-950 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  OpenAPI 3.0.3 Validated
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono">
                  <Globe className="w-3 h-3" />
                  REST v1.0
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono">
                  <Cpu className="w-3 h-3" />
                  Sharp WebP Engine
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono">
                  <Database className="w-3 h-3" />
                  R2 / S3 Storage
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                MMS CloudVault API Reference
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Seamlessly ingest images and audio, execute on-the-fly Sharp WebP transformations, generate progressive BlurHashes, and manage cloud assets. Authenticate requests using your application&apos;s <code className="text-xs font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-900 dark:text-zinc-200 font-semibold">x-api-key</code> header.
              </p>

              <div className="pt-1 flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <span>Base URL:</span>
                <code className="px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold select-all">
                  {appUrl}
                </code>
              </div>
            </div>

            {/* Action Buttons: Postman Export + Raw OpenAPI */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <PostmanExportButton />

              <a
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Raw OpenAPI JSON
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 container mx-auto w-full px-4 py-8">
        <SwaggerView url="/api/v1/openapi.json" />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        © 2026 MMS CloudVault. Powered by Next.js & Sharp Media Optimization Engine.
      </footer>
    </div>
  );
}
