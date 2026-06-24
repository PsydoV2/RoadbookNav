import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const SITE_URL = "https://roadbook.sfalter.de/";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Roadbook Nav — Offline Motorcycle Roadbook & Rally Navigation",
    template: "%s · Roadbook Nav",
  },
  description:
    "A bare-minimum digital roadbook for motorcycle rally, enduro and trail riding. Plan waypoints at home, export a JSON, navigate fully offline — no maps, no accounts, no tracking.",
  applicationName: "Roadbook Nav",
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
  authors: [{ name: "Roadbook Nav" }],
  alternates: { canonical: "/" },
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
    title: "Roadbook Nav",
  },
  openGraph: {
    type: "website",
    siteName: "Roadbook Nav",
    title: "Roadbook Nav — Offline Motorcycle Roadbook & Rally Navigation",
    description:
      "Plan waypoints at home, ride fully offline. One arrow, one distance — the paper tulip card, digitised. No signal required.",
    url: SITE_URL,
    locale: "en",
    images: [
      {
        url: "/editor_preview.png",
        width: 1918,
        height: 1079,
        alt: "Roadbook Nav editor — a route planned through forest terrain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Roadbook Nav — Offline Motorcycle Roadbook Navigation",
    description:
      "Plan waypoints at home, ride fully offline. One arrow, one distance. No signal required.",
    images: ["/editor_preview.png"],
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
      </body>
    </html>
  );
}
