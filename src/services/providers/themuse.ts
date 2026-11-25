import { fetchWithRetry, stripHtml } from "./http";
import type {
    JobProvider,
    ProviderJob,
    ProviderSearchParams,
    ProviderSearchResult,
} from "./types";

interface MuseJob {
  id: number;
  name: string;
  type: string;
  publication_date: string;
  short_name: string;
  model_type: string;
  categories: { name: string; short_name: string }[];
  levels: { name: string; short_name: string }[];
  locations: { name: string }[];
  refs: { landing_page: string };
  contents: string;
  company: {
    name: string;
    short_name: string;
    model_type: string;
    locations: { name: string }[];
  };
}

export class TheMuseProvider implements JobProvider {
  name = "TheMuse";

  isConfigured(): boolean {
    return true; // Free API, no key required
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const { page = 1, filters } = params;

    try {
      const url = new URL("https://www.themuse.com/api/public/jobs");
      url.searchParams.set("page", String(page - 1)); // Muse uses 0-indexed

      // Add optional api_key for higher rate limits
      const apiKey = process.env.THEMUSE_API_KEY;
      if (apiKey) {
        url.searchParams.set("api_key", apiKey);
      }

      // Map filters to Muse parameters
      if (filters?.job_title) {
        // Muse doesn't have a direct title search, use category
        url.searchParams.set("category", filters.job_title);
      }
      if (filters?.location) {
        url.searchParams.set("location", filters.location);
      }
      if (filters?.experience_level?.[0]) {
        url.searchParams.set("level", filters.experience_level[0]);
      }
      if (filters?.employment_type?.[0]) {
        // Muse uses type field
        url.searchParams.set("type", filters.employment_type[0]);
      }

      const res = await fetchWithRetry(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return { provider: this.name, jobs: [], error: `HTTP ${res.status}` };
      }

      const data = (await res.json()) as {
        results: MuseJob[];
        page: number;
        total: number;
        page_count: number;
      };

      const jobs: ProviderJob[] = (data.results ?? []).map((job) => {
        const location = job.locations?.[0]?.name ?? "";
        const companyLocation = job.company?.locations?.[0]?.name ?? "";
        const level = job.levels?.[0]?.short_name ?? "";

        return {
          external_id: `muse-${job.id}`,
          title: job.name,
          company: job.company?.name ?? "Unknown",
          location,
          country: inferCountry(location || companyLocation),
          description: stripHtml(job.contents ?? "").slice(0, 5000),
          application_url: job.refs?.landing_page ?? "",
          source_name: "the_muse",
          employment_type: mapEmploymentType(job.type),
          experience_level: mapExperienceLevel(level),
          remote_status: location.toLowerCase().includes("remote") ? "remote" : "on-site",
          published_at: job.publication_date,
          salary_min: null,
          salary_max: null,
          salary_currency: null,
          salary_period: null,
          required_skills: extractSkills(stripHtml(job.contents ?? "")),
          is_mock: false,
        };
      });

      return {
        provider: this.name,
        jobs,
        total: data.total ?? jobs.length,
      };
    } catch (err) {
      return {
        provider: this.name,
        jobs: [],
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

function inferCountry(location: string): string {
  const loc = location.toLowerCase();
  if (loc.includes("remote")) return "Remote";
  if (loc.includes("united states") || loc.includes("usa")) return "US";
  if (loc.includes("canada")) return "CA";
  if (loc.includes("united kingdom") || loc.includes("uk")) return "UK";
  if (loc.includes("australia")) return "AU";
  if (loc.includes("germany")) return "DE";
  if (loc.includes("france")) return "FR";
  if (loc.includes("netherlands")) return "NL";
  if (loc.includes("spain")) return "ES";
  if (loc.includes("italy")) return "IT";
  if (loc.includes("india")) return "IN";
  if (loc.includes("brazil")) return "BR";
  if (loc.includes("mexico")) return "MX";
  return "";
}

function mapEmploymentType(type: string): string {
  const t = type?.toLowerCase() ?? "";
  if (t.includes("full")) return "full-time";
  if (t.includes("part")) return "part-time";
  if (t.includes("contract")) return "contract";
  if (t.includes("intern")) return "internship";
  if (t.includes("freelance")) return "freelance";
  return "full-time";
}

function mapExperienceLevel(level: string): string {
  const l = level?.toLowerCase() ?? "";
  if (l.includes("entry") || l.includes("junior")) return "entry";
  if (l.includes("mid")) return "mid";
  if (l.includes("senior") || l.includes("lead")) return "senior";
  if (l.includes("executive") || l.includes("director")) return "executive";
  return "mid";
}

function extractSkills(text: string): string[] {
  const skills: string[] = [];
  const keywords = [
    "javascript", "typescript", "python", "java", "go", "rust", "c++",
    "react", "vue", "angular", "node", "express", "nextjs", "django",
    "flask", "spring", "aws", "azure", "gcp", "docker", "kubernetes",
    "postgresql", "mysql", "mongodb", "redis", "graphql", "rest",
    "machine learning", "ai", "data", "analytics", "devops",
  ];
  const lower = text.toLowerCase();
  for (const skill of keywords) {
    if (lower.includes(skill)) skills.push(skill);
  }
  return skills.slice(0, 20);
}
