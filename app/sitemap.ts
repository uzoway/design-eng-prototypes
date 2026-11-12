import type { MetadataRoute } from "next";
import { prototypes } from "./lab/prototypes";

export const dynamic = "force-static";

const siteUrl = "https://uzookafor.com";

// Live concept pages that are not in the lab list but are linked from my Contra projects.
const unlisted = ["/skip-ai-overview", "/linkedin-nav"];

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/lab",
    ...prototypes.map((p) => p.href ?? `/${p.slug}`),
    ...unlisted,
  ];

  return routes.map((route) => ({
    // trailingSlash is on in next.config, so every page lives at a path ending in /
    url: `${siteUrl}${route}/`,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : route === "/lab" ? 0.8 : 0.6,
  }));
}
