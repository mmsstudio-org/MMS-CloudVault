"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { Loader2 } from "lucide-react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-20 text-zinc-500 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      <p className="text-sm">Loading Interactive Swagger API Documentation...</p>
    </div>
  ),
});

export function SwaggerView({ url }: { url: string }) {
  return (
    <div className="swagger-wrapper bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
      <SwaggerUI url={url} docExpansion="list" defaultModelsExpandDepth={-1} />
    </div>
  );
}
