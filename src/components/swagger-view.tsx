"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import "@/styles/swagger-custom.css";
import { Loader2, KeyRound, Sparkles, Code2 } from "lucide-react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-24 text-zinc-500 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      <p className="text-sm font-medium">Loading Interactive OpenAPI Playground...</p>
    </div>
  ),
});

export function SwaggerView({ url }: { url: string }) {
  return (
    <div className="space-y-4">
      {/* Quick API Key Testing Tip Banner */}
      <div className="p-4 rounded-xl border border-border bg-card/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Live API Testing:</span>{" "}
            <span className="text-muted-foreground">
              Click the green <strong className="text-emerald-500 font-bold">Authorize 🔓</strong> button below to input your app&apos;s <code className="font-mono bg-muted text-foreground px-1 py-0.5 rounded text-[11px] font-semibold">x-api-key</code> before running live test requests.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-[11px] font-mono text-muted-foreground">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Sharp WebP Engine
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-[11px] font-mono text-muted-foreground">
            <Code2 className="w-3 h-3 text-sky-500" />
            Audio MP3 Direct
          </span>
        </div>
      </div>

      {/* Modernized Swagger UI Card Container */}
      <div className="swagger-wrapper bg-card/90 rounded-2xl p-3.5 sm:p-6 lg:p-8 shadow-sm border border-border overflow-hidden">
        <SwaggerUI url={url} docExpansion="list" defaultModelsExpandDepth={-1} />
      </div>
    </div>
  );
}
