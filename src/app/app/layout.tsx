import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/site";

// page.tsx is a client component and can't export metadata, so it lives here.
export const metadata: Metadata = {
  title: "Route Editor & Offline Navigation",
  description:
    "Plan a motorcycle roadbook on the map, assign a turn arrow to each waypoint, export it as JSON and navigate offline with a full-screen arrow and distance countdown.",
  alternates: { canonical: "/app/" },
  openGraph: {
    type: "website",
    url: "/app/",
    title: "Roadbook Nav — Route Editor & Offline Navigation",
    description:
      "Plan waypoints on the map at home, then ride with one arrow and one distance — fully offline.",
    locale: "en_US",
    images: [OG_IMAGE],
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
