import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!publicAppUrl) {
    return NextResponse.next();
  }

  try {
    const targetUrl = new URL(publicAppUrl);
    const targetHost = targetUrl.host.toLowerCase(); // includes port if specified (e.g. localhost:3000)
    const targetProtocol = targetUrl.protocol; // "http:" or "https:"

    const rawHost =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      req.nextUrl.host;
    const currentHost = rawHost.toLowerCase().split(",")[0].trim();

    const currentProto = (
      req.headers.get("x-forwarded-proto") ||
      (req.url.startsWith("https") ? "https" : "http")
    )
      .toLowerCase()
      .split(",")[0]
      .trim();

    const isCurrentLocal =
      currentHost.includes("localhost") || currentHost.includes("127.0.0.1");
    const isTargetLocal =
      targetHost.includes("localhost") || targetHost.includes("127.0.0.1");

    // Guard: Prevent disrupting local testing if production URL is configured in dev
    if (process.env.NODE_ENV === "development" && isCurrentLocal && !isTargetLocal) {
      return NextResponse.next();
    }

    const hostMismatch = currentHost !== targetHost;
    const protoMismatch =
      targetProtocol === "https:" && currentProto === "http" && !isCurrentLocal;

    if (hostMismatch || protoMismatch) {
      const redirectUrl = new URL(
        `${targetUrl.origin}${req.nextUrl.pathname}${req.nextUrl.search}`
      );

      // 308 Permanent Redirect for canonical URL enforcement
      return NextResponse.redirect(redirectUrl, { status: 308 });
    }
  } catch (err) {
    console.error("[Middleware] Canonical URL redirect error:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static chunks)
     * - _next/image (image optimization)
     * - favicon.ico, logo.png, icon.png, public static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
