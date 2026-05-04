import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/profile"];

// Routes only for unauthenticated users
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

// Post-login redirect default
const DEFAULT_DASHBOARD = "/dashboard";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;

  // ── API proxy: inject Authorization header for backend calls ──────────────
  if (pathname.startsWith("/api/v1/")) {
    if (!accessToken) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
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
