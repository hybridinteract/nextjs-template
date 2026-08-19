import type { MetadataRoute } from "next";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "My App";

/**
 * The web app manifest — what makes the app installable.
 *
 * This is the **whole** PWA story in this template, and that is deliberate:
 * there is no service worker. A manifest is pure declaration and cannot break
 * anything. A service worker is a caching proxy that outlives the page, and in
 * an app whose data sits behind a login it is a genuine hazard — see
 * `docs/rules/17-pwa-and-offline.md` before adding one.
 *
 * What installability buys you today: a home-screen icon, a standalone window
 * with no browser chrome, and a splash screen. Not offline.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Built with the Hybrid Interactive Next.js template",
    // Landing on /dashboard rather than / means an installed app opens where the
    // user works. Unauthenticated, `proxy.ts` bounces them to /login anyway.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // A maskable icon is full-bleed: the launcher applies its own shape mask.
      // Without one, Android draws your square icon inside a white circle.
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
