"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({
  text,
  label = "Copy URL",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Public URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL to clipboard.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      className={
        className ||
        "w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
      }
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
