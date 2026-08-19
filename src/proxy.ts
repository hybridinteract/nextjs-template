import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/profile"];

// Routes only for unauthenticated users
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

// Post-login redirect default
const DEFAULT_DASHBOARD = "/dashboard";

// Backend origin for the API proxy. Next has no /api/v1/* routes of its own —
// this proxy rewrites those requests to the real backend after attaching the
// token, which is what keeps the browser same-origin (see lib/api-client.ts).
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Headers a backend uses to decide "who is calling" — they feed rate limits and
// the audit trail. A browser can set these on a fetch, and this proxy copies
// incoming headers wholesale, so they are stripped here and left for the real
// proxy to write. A deployed nginx overwrites them anyway
// (proxy_set_header X-Real-IP $remote_addr), but the API must not depend on an
// nginx it might not be behind.
const SPOOFABLE_HOP_HEADERS = [
  "x-real-ip",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "forwarded",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;

  // ── API proxy: attach the token and forward to the backend ────────────────
  if (pathname.startsWith("/api/v1/")) {
    if (!accessToken) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    for (const header of SPOOFABLE_HOP_HEADERS) requestHeaders.delete(header);

    // rewrite(), not next(). There is no /api/v1/* route in this app, so next()
    // falls through to a 404 and the token never reaches the backend.
    const target = new URL(`${pathname}${search}`, BACKEND_URL);
    return NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  }

  // ── Route protection: redirect to login if not authenticated ─────────────
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  if (isProtected && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Auth route guard: redirect logged-in users away from login page ───────
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute && accessToken) {
    return NextResponse.redirect(new URL(DEFAULT_DASHBOARD, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
