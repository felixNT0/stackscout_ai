import { site } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0B1120",
    theme_color: "#10172A",
    categories: ["productivity", "business", "education"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "Search Jobs",
        short_name: "Search",
        description: "Search for jobs",
        url: "/dashboard/search",
        icons: [{ src: "/icon.svg", sizes: "any" }],
      },
      {
        name: "My Applications",
        short_name: "Applications",
        description: "View your applications",
        url: "/dashboard/applications",
        icons: [{ src: "/icon.svg", sizes: "any" }],
      },
      {
        name: "AI Tools",
        short_name: "Tools",
        description: "AI career tools",
        url: "/dashboard/tools",
        icons: [{ src: "/icon.svg", sizes: "any" }],
      },
    ],
  };
}
