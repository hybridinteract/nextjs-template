import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Security headers for the browser-facing app.
 *
 * **This file is usually the only place these get set.** A deployment may sit
 * behind nginx or a CDN that adds them, and it may not — don't assume. Setting
 * them here means the app is safe by default wherever it is served from.
 *
 * CSP notes:
 * - `'unsafe-inline'` on script-src is required by Next's inline bootstrap and
 *   RSC flight payloads. Removing it needs per-request nonces, which conflict
 *   with static optimisation. `'unsafe-eval'` is dev-only (React Refresh).
 * - `img-src https:` is deliberately open: avatars and attachments are typically
 *   served from presigned storage URLs whose host is not known at build time.
 *   Images cannot execute, so this is the cheap correct trade. `http:` is added
 *   outside production because local object storage is usually plain HTTP —
 *   without it every uploaded image 404s silently behind a CSP violation.
 * - `connect-src 'self'` is tight on purpose: every API call goes through the
 *   same-origin proxy (`api-client.ts` only ever builds relative URLs). If you
 *   ever add an XHR straight to storage, widen this deliberately, not by reflex.
 * - `frame-src blob:` lets the app preview a generated PDF in an iframe. Without
 *   it the pane shows "content blocked" with nothing in the console pointing at
 *   the CSP. A blob: URL can only be minted by same-origin script, so it grants
 *   an attacker nothing they would not already have with XSS.
 */
const storageSchemes = isProd ? "https:" : "https: http:";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storageSchemes}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  `media-src 'self' blob: ${storageSchemes}`,
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // frame-ancestors above covers modern browsers; this is the legacy equivalent.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Don't advertise the framework version to anyone scanning for known CVEs.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
