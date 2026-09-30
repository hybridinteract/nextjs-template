import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "My App";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: "Built with the Hybrid Interactive Next.js template",
  // Installable: see src/app/manifest.ts. There is no service worker — read
  // docs/rules/17-pwa-and-offline.md before adding one.
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Matches the manifest's theme_color, per theme, so the browser and OS chrome
  // do not flash the wrong colour on load.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  // Lets the app paint into the safe areas on a notched phone. The Modal's
  // bottom sheet already pads for the home indicator with env(safe-area-inset-*).
  viewportFit: "cover",
};

/**
 * Fonts, metadata and the providers every route needs. Nothing else.
 *
 * Query, toasts, the loading overlay and the session dialog are not here. The
 * (auth) and (dashboard) layouts mount them through <AppProviders>, so the public
 * site never downloads them. See components/providers/app-providers.tsx.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Here, not in a group's layout, because the public site needs it
            too. Its class has to be on <html> before the first paint, or the
            page flashes the wrong theme. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
