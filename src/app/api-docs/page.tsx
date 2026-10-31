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
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Navigation */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 font-semibold text-sm hover:opacity-80 transition shrink-0"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-black flex items-center justify-center shrink-0 shadow-xs">
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
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-medium border border-emerald-500/20 hidden xs:inline-flex">
              API Docs
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-1 px-1.5 py-1 rounded-lg"
              title="Open Dashboard"
            >
              <span className="hidden sm:inline">Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted"
              title="Back to Homepage"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Back</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="border-b border-border bg-gradient-to-b from-card to-background py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  OpenAPI 3.0.3 Validated
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono">
                  <Globe className="w-3 h-3" />
                  REST v1.0
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono">
                  <Cpu className="w-3 h-3" />
                  Sharp WebP Engine
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono">
                  <Database className="w-3 h-3" />
                  R2 / S3 Storage
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                MMS CloudVault API Reference
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Seamlessly ingest images and audio, execute on-the-fly Sharp WebP transformations, generate progressive BlurHashes, and manage cloud assets. Authenticate requests using your application&apos;s <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">x-api-key</code> header.
              </p>

              <div className="pt-1 flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <span>Base URL:</span>
                <code className="px-2 py-0.5 rounded bg-muted text-foreground font-bold select-all">
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition"
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
      <footer className="border-t border-border py-6 text-center text-xs text-zinc-500">
        © 2026 MMS CloudVault. Powered by Next.js & Sharp Media Optimization Engine.
      </footer>
    </div>
  );
}
