import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  // Never perform canonical host redirects in development mode or for local/private network addresses
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!publicAppUrl) {
    return NextResponse.next();
  }

  try {
    const rawHost =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      req.nextUrl.host;
    const currentHost = (rawHost || "").toLowerCase().split(",")[0].trim();

    const isCurrentLocal =
      currentHost.includes("localhost") ||
      currentHost.includes("127.0.0.1") ||
      currentHost.includes("0.0.0.0") ||
      currentHost.startsWith("192.168.") ||
      currentHost.startsWith("10.") ||
      currentHost.startsWith("172.");

    // Allow Cloudflare tunnels and custom tunnels (e.g. next.aponabd.com)
    const isTunnelOrAllowedHost =
      currentHost.includes("aponabd.com") ||
      currentHost.includes("trycloudflare.com") ||
      currentHost.includes("ngrok");

    if (isCurrentLocal || isTunnelOrAllowedHost) {
      return NextResponse.next();
    }

    const targetUrl = new URL(publicAppUrl);
    const targetHost = targetUrl.host.toLowerCase();
    const targetProtocol = targetUrl.protocol;

    const currentProto = (
      req.headers.get("x-forwarded-proto") ||
      (req.url.startsWith("https") ? "https" : "http")
    )
      .toLowerCase()
      .split(",")[0]
      .trim();

    const hostMismatch = currentHost !== targetHost;
    const protoMismatch = targetProtocol === "https:" && currentProto === "http";

    if (hostMismatch || protoMismatch) {
      const redirectUrl = new URL(
        `${targetUrl.origin}${req.nextUrl.pathname}${req.nextUrl.search}`
      );

      // Temporary redirect (307) instead of 308 to avoid permanent browser cache poisoning
      return NextResponse.redirect(redirectUrl, { status: 307 });
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
