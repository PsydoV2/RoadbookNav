import type { MetadataRoute } from "next";

const SITE_URL = "https://roadbook.sfalter.de/";

// Static export: emitted as /robots.txt at build time.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
