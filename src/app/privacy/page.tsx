import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Server } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy and data protection terms for MMS CloudVault.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
            <span className="font-bold tracking-tight">MMS CloudVault</span>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Back to Home</span>
              <span className="xs:hidden">Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Google OAuth & App Privacy Compliant
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Last Updated: October 31, 2026 • Published by{" "}
            <a
              href="https://studio.sabbirmms.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-zinc-900 dark:hover:text-white"
            >
              MMS Studio
            </a>
          </p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-emerald-500" /> 1. Overview and Core Commitment
            </h2>
            <p>
              MMS CloudVault is a dedicated digital media asset pipeline and object storage delivery infrastructure operated by MMS Studio (
              <a
                href="https://studio.sabbirmms.com"
                className="text-emerald-500 underline"
                target="_blank"
                rel="noreferrer"
              >
                studio.sabbirmms.com
              </a>
              ). We take your privacy, data security, and confidentiality with paramount seriousness. This Privacy Policy outlines what information we process, how authentication credentials are used, and our commitment to zero third-party data selling.
            </p>
          </section>

          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-sky-500" /> 2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Google Account Authentication Data:</strong> When administrators sign in via Google OAuth 2.0, we only receive and verify your primary Google email address, full name, and avatar picture. We do <em>not</em> access Google Drive, Gmail messages, contacts, or any other personal Google user data.
              </li>
              <li>
                <strong>Authorized Email Whitelisting:</strong> Access to the administrative portal is strictly restricted to pre-approved administrator emails configured in the system whitelist. Unauthorized accounts are immediately rejected and no account records or sessions are retained.
              </li>
              <li>
                <strong>Uploaded Media Assets:</strong> Image files, titles, and unique asset IDs uploaded via authorized API keys or the administrative dashboard are stored within our S3-compatible cloud object storage (Cloudflare R2 / AWS S3) for the sole purpose of delivery to your mobile/web applications.
              </li>
              <li>
                <strong>Technical Logs:</strong> IP address, browser user-agent, and API request timestamps are recorded temporarily solely for rate limiting, DDoS mitigation, and diagnostic logging.
              </li>
            </ul>
          </section>

          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-purple-500" /> 3. How Media Assets Are Processed & Stored
            </h2>
            <p>
              Uploaded images are processed directly in-memory using the high-performance Sharp optimization engine:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Images exceeding defined max dimensions are smoothly downscaled preserving aspect ratio.</li>
              <li>Assets are compressed into modern WebP format to conserve mobile bandwidth and device storage.</li>
              <li>A compact <code>blur_hash</code> placeholder string is calculated for seamless progressive client-side loading.</li>
              <li>When an updated image is uploaded for an existing asset ID, previous assets are automatically recycled.</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-amber-500" /> 4. Data Retention, Soft Deletes & Purging
            </h2>
            <p>
              Deleted assets are preserved in a soft-deleted Trash state for up to 30 days, allowing authorized administrators to restore accidentally removed items. After 30 days, or upon manual administrator trigger via the dashboard, assets are permanently destroyed from both object storage and the relational database.
            </p>
          </section>

          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
              5. Contact Us
            </h2>
            <p>
              For privacy inquiries, security notifications, or data deletion requests, contact the MMS Studio Engineering Team:
            </p>
            <div className="mt-3 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 font-mono text-xs">
              <p>Organization: MMS Studio</p>
              <p>Email: mr.sabbirmms@gmail.com</p>
              <p>Portfolio & Headquarters: https://studio.sabbirmms.com</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        © 2026 MMS Studio. All rights reserved.
      </footer>
    </div>
  );
}
