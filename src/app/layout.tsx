import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

// Canonicals are set per page — a root-level canonical would leak into every route.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Roadbook Nav — Offline Motorcycle Roadbook & Rally Navigation",
    template: "%s · Roadbook Nav",
  },
  description:
    "Offline digital roadbook for motorcycle rally, enduro and trail riding. Plan waypoints at home, then ride with one arrow and one distance. No signal, no account.",
  applicationName: SITE_NAME,
  keywords: [
    "digital roadbook",
    "motorcycle navigation",
    "offline GPS",
    "rally navigation",
    "enduro navigation",
    "tulip roadbook",
    "trail riding",
    "roadbook app",
    "waypoint navigation",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png" },
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Roadbook Nav — Offline Motorcycle Roadbook & Rally Navigation",
    description:
      "Plan waypoints at home, ride fully offline. One arrow, one distance — the paper tulip card, digitised. No signal required.",
    locale: "en_US",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Roadbook Nav — Offline Motorcycle Roadbook Navigation",
    description:
      "Plan waypoints at home, ride fully offline. One arrow, one distance. No signal required.",
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-black text-white antialiased"
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegistration />
        <Script
          defer
          src="https://webstats.sfalter.de/script.js"
          data-website-id="d4b23bd6-589b-446f-ae8c-1cd4cd4bbbab"
        />
      </body>
    </html>
  );
}
