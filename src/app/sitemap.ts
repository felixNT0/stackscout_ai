import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Public, indexable routes only — dashboard/auth/api are excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/features", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/contact", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  ];

  return routes.map((r) => ({
    url: new URL(r.path, site.url).toString(),
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
