"use client";

import React, { useState } from "react";
import { Download, Copy, Check, FileJson, HelpCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export function PostmanExportButton() {
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyOpenApiUrl = async () => {
    try {
      const url = `${window.location.origin}/api/v1/openapi.json`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("OpenAPI URL copied! In Postman, click 'Import' and paste this URL.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy URL to clipboard.");
    }
  };

  const handleDownloadCollection = () => {
    toast.success("Downloading official Postman Collection v2.1...");
  };

  return (
    <div className="relative inline-block text-left">
      <div className="inline-flex items-center rounded-lg shadow-xs">
        <a
          href="/api/v1/postman.json?download=1"
          onClick={handleDownloadCollection}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-l-lg border border-r-0 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold transition cursor-pointer"
        >
          {/* Postman Icon SVG */}
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.23 16.71c-3.14 0-5.71-2.57-5.71-5.71 0-1.85.89-3.5 2.27-4.52l1.24 1.24c-1.01.76-1.65 1.98-1.65 3.28 0 2.26 1.84 4.1 4.1 4.1 1.77 0 3.29-1.12 3.87-2.71h-3.87v-1.62h5.71c.07.41.11.83.11 1.26 0 3.14-2.57 5.67-6.07 5.67z" />
          </svg>
          <span>Export to Postman</span>
          <Download className="w-3.5 h-3.5" />
        </a>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1.5 rounded-r-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold transition cursor-pointer"
          title="More Postman Options"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl z-50 text-xs">
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Postman Integration
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Ready-to-use requests with headers, variables, and multipart upload schemas.
              </p>
            </div>

            <a
              href="/api/v1/postman.json?download=1"
              onClick={() => {
                handleDownloadCollection();
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Download Collection (v2.1 JSON)
                </p>
                <p className="text-[10px] text-zinc-500">
                  Drag and drop directly into Postman
                </p>
              </div>
            </a>

            <button
              type="button"
              onClick={() => {
                handleCopyOpenApiUrl();
                setIsOpen(false);
              }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Copy OpenAPI URL for Postman
                </p>
                <p className="text-[10px] text-zinc-500">
                  In Postman: Click Import → Paste URL
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowGuide(true);
                setIsOpen(false);
              }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-sky-500 shrink-0" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  How to Import (3 Steps)
                </p>
                <p className="text-[10px] text-zinc-500">
                  View step-by-step import instructions
                </p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  How to Import into Postman
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <ol className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  1
                </span>
                <div>
                  <strong className="text-zinc-900 dark:text-zinc-100">Download Collection:</strong> Click the &ldquo;Export to Postman&rdquo; button above to download the <code className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">mms-cloudvault.postman_collection.json</code> file.
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  2
                </span>
                <div>
                  <strong className="text-zinc-900 dark:text-zinc-100">Import into Postman:</strong> Open the Postman Desktop App or Web workspace, click the <span className="font-semibold text-emerald-500">Import</span> button in the top left, and drop the downloaded JSON file (or choose <em>Link</em> and paste the OpenAPI URL).
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 font-bold text-[11px]">
                  3
                </span>
                <div>
                  <strong className="text-zinc-900 dark:text-zinc-100">Set API Key & Test:</strong> Go to the Collection Variables tab in Postman, set the <code className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">apiKey</code> variable to your app&apos;s secret key, and hit Send on any request!
                </div>
              </li>
            </ol>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
