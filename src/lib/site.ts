/** Central site metadata — single source of truth for SEO/OG tags. */
export const site = {
  name: "StackScout AI",
  tagline: "Discover the right opportunity. Let AI find your next career move.",
  description:
    "AI-powered job discovery and career intelligence. Upload your resume for personalized matching or search manually across multiple job providers — no resume required.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "en_US",
  keywords: [
    "AI job search",
    "job discovery",
    "resume analysis",
    "job matching",
    "career intelligence",
    "software engineer jobs",
    "remote jobs",
    "application tracking",
  ],
} as const;

export function absoluteUrl(path = "/"): string {
  return new URL(path, site.url).toString();
}
