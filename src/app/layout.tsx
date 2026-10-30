import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/toaster-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://storage.sabbirmms.com"),
  title: {
    default: "MMS Studio Storage — High-Performance Media & Asset Infrastructure",
    template: "%s | MMS Studio Storage",
  },
  description:
    "Ultra-low latency, serverless object storage, Sharp-powered image optimization pipeline, and secure asset delivery engine for MMS Studio applications and mobile products.",
  keywords: [
    "MMS Studio",
    "Object Storage",
    "Media Delivery",
    "Image CDN",
    "Sharp Image Optimizer",
    "FastAPI Story Assets",
    "Sabbir MMS",
  ],
  authors: [{ name: "MMS Studio", url: "https://studio.sabbirmms.com" }],
  creator: "MMS Studio",
  publisher: "MMS Studio",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  openGraph: {
    title: "MMS Studio Storage — High-Performance Media Infrastructure",
    description:
      "Enterprise-grade media asset storage, automated compression, and instant delivery CDN for modern applications.",
    url: "https://storage.sabbirmms.com",
    siteName: "MMS Studio Storage",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "MMS Studio Storage Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased selection:bg-zinc-800 selection:text-white flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
