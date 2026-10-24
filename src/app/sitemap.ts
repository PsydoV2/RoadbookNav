import type { MetadataRoute } from "next";
import { GUIDES, LAST_UPDATED, SITE_URL } from "@/lib/site";

// Static export: emitted as /sitemap.xml at build time.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // Fixed date instead of build time — a lastmod that changes on every deploy gets ignored.
  const lastModified = new Date(LAST_UPDATED);
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}${g.path}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/app/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
