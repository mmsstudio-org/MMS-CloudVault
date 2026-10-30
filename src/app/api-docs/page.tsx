import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SwaggerView } from "@/components/swagger-view";

export const metadata = {
  title: "API Documentation & Swagger UI",
  description:
    "Interactive OpenAPI specification and live testing playground for MMS Studio Storage REST endpoints.",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-sm hover:opacity-80 transition"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-black flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="MMS Studio Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span>MMS Studio Storage</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
              API Docs
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Dashboard
              <ExternalLink className="w-3 h-3" />
            </Link>
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-2 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              OpenAPI 3.0.3 Validated
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Interactive API Reference
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Test media uploads, deduplication, story URL fetching, and soft deletes live using your application&apos;s <code className="text-xs font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">x-api-key</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Raw OpenAPI JSON
            </a>
          </div>
        </div>

        {/* Swagger UI Component */}
        <SwaggerView url="/api/v1/openapi.json" />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} MMS Studio. Powered by Next.js & Sharp Engine.
      </footer>
    </div>
  );
}
