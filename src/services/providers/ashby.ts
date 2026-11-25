import { fetchWithRetry, stripHtml } from "./http";
import type {
    JobProvider,
    ProviderJob,
    ProviderSearchParams,
    ProviderSearchResult,
} from "./types";

interface AshbyJob {
  id: string;
  title: string;
  department: string;
  team: string;
  location: string;
  employmentType: string;
  workplaceType: string;
  publishedAt: string;
  description: string;
  isListed: boolean;
}

/**
 * Ashby job board provider.
 * Uses the public posting API — no key required.
 * Company slugs come from ASHBY_COMPANY_SLUGS env var (comma-separated).
 */
export class AshbyProvider implements JobProvider {
  name = "Ashby";

  isConfigured(): boolean {
    return true; // Public API, no key needed (uses company slugs)
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const { query, page = 1, pageSize = 20, filters } = params;

    // Get company slugs from env
    const slugs = (process.env.ASHBY_COMPANY_SLUGS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // If no slugs configured, try a default set of known companies
    const companies = slugs.length
      ? slugs
      : ["stripe", "figma", "linear", "vercel", "notion", "airtable", "asana", "miro", "loom", "zapier"];

    const allJobs: ProviderJob[] = [];

    // Fetch jobs from multiple companies in parallel
    const results = await Promise.allSettled(
      companies.slice(0, 10).map(async (company) => {
        const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company)}`;
        const res = await fetchWithRetry(url, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) return [];

        const data = (await res.json()) as { jobs: AshbyJob[] };
        return (data.jobs ?? []).map((job): ProviderJob => ({
          external_id: `ashby-${company}-${job.id}`,
          title: job.title,
          company: job.department ?? company,
          location: job.location ?? null,
          country: inferCountry(job.location ?? ""),
          description: stripHtml(job.description ?? "").slice(0, 5000),
          application_url: `https://jobs.ashbyhq.com/${company}/${job.id}`,
          source_name: "ashby",
          employment_type: mapEmploymentType(job.employmentType),
          experience_level: mapExperienceLevel(job.title),
          remote_status: (job.workplaceType?.toLowerCase().includes("remote")
            ? "remote"
            : "on-site") as "remote" | "on-site",
          published_at: job.publishedAt,
          salary_min: null,
          salary_max: null,
          salary_currency: null,
          salary_period: null,
          required_skills: extractSkills(stripHtml(job.description ?? "")),
          is_mock: false,
        }));
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allJobs.push(...result.value);
      }
    }

    // Filter by query if provided
    const filtered = query
      ? allJobs.filter((j) =>
          `${j.title} ${j.company} ${j.description}`.toLowerCase().includes(query.toLowerCase()),
        )
      : allJobs;

    // Apply additional filters
    const finalJobs = applyFilters(filtered, filters);

    // Paginate
    const start = (page - 1) * pageSize;
    const paginated = finalJobs.slice(start, start + pageSize);

    return {
      provider: this.name,
      jobs: paginated,
      total: finalJobs.length,
    };
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

function mapExperienceLevel(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("intern") || t.includes("junior") || t.includes("entry")) return "entry";
  if (t.includes("senior") || t.includes("staff") || t.includes("lead") || t.includes("principal")) return "senior";
  if (t.includes("director") || t.includes("vp") || t.includes("head")) return "executive";
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

function applyFilters(jobs: ProviderJob[], filters?: ProviderSearchParams["filters"]): ProviderJob[] {
  if (!filters) return jobs;
  return jobs.filter((j) => {
    const text = `${j.title} ${j.company} ${j.description}`.toLowerCase();
    if (filters.job_title && !text.includes(filters.job_title.toLowerCase())) return false;
    if (filters.company && !j.company.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.location && !(j.location ?? "").toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.remote_status?.length && j.remote_status && !filters.remote_status.includes(j.remote_status)) return false;
    if (filters.employment_type?.length && j.employment_type && !filters.employment_type.includes(j.employment_type)) return false;
    return true;
  });
}
