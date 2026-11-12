import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Everything is public, AI crawlers included, so answer engines can cite the work.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://uzookafor.com/sitemap.xml",
    host: "https://uzookafor.com",
  };
}
