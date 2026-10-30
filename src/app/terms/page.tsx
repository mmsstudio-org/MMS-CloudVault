import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, KeyRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Terms of Service",
  description: "Terms and conditions governing the use of MMS Studio Storage API and Admin Portal.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-500/20">
            <FileText className="w-3.5 h-3.5" />
            Legal Service Agreement
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Effective Date: October 31, 2026 • Governing Service: MMS Studio Media Storage Infrastructure
          </p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1. Acceptance of Terms
            </h2>
            <p>
              By accessing the MMS Studio Storage portal, using the REST API endpoints, or retrieving media assets generated through this infrastructure, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the services.
            </p>
          </section>

          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-indigo-500" /> 2. API Key Security & Client Responsibility
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Access to programmatic upload endpoints requires a valid, active API Secret Key (<code>x-api-key</code>) issued by MMS Studio.
              </li>
              <li>
                You are solely responsible for maintaining the confidentiality of your API keys. Leaked or compromised keys must be revoked immediately via the Admin Dashboard.
              </li>
              <li>
                Automated rate limits apply per API key to ensure fair bandwidth allocation across connected applications.
              </li>
            </ul>
          </section>

          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> 3. Prohibited Media & Fair Use Policy
            </h2>
            <p>Users and connected clients agree not to upload:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Malicious payloads, executable binaries disguised as images, or steganographic malware.</li>
              <li>Content that infringes upon copyright, trademarks, or proprietary intellectual property.</li>
              <li>Excessive automated spamming designed to exhaust server memory or object storage limits.</li>
            </ul>
          </section>

          <section className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
              4. Service Availability & Termination
            </h2>
            <p>
              MMS Studio reserves the right to suspend or revoke API access keys or user administrative privileges at any time in case of security breaches, unauthorized abuse, or violation of these terms.
            </p>
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
