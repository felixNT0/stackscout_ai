import { fetchWithRetry } from "./http";
import type {
    JobProvider,
    ProviderJob,
    ProviderSearchParams,
    ProviderSearchResult,
} from "./types";

interface RemoteBackendJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  apply_url: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  posted_at: string;
  tags: string[];
  seniority?: string;
  remote?: boolean;
}

export class RemoteBackendJobsProvider implements JobProvider {
  name = "RemoteBackendJobs";

  isConfigured(): boolean {
    return true; // Free public API
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const { query, page = 1, pageSize = 20, filters } = params;
    const limit = Math.min(pageSize, 20);
    const offset = (page - 1) * limit;

    try {
      const url = new URL("https://www.remotebackendjobs.com/api/jobs");
      url.searchParams.set("board", "backend");
      url.searchParams.set("query", query || "backend");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));

      // Add filters
      if (filters?.remote_status?.includes("remote")) {
        url.searchParams.set("regions", "worldwide");
      }
      if (filters?.salary_min) {
        url.searchParams.set("minSalaryYearly", String(filters.salary_min));
      }
      if (filters?.date_posted === "24h") {
        url.searchParams.set("postedWithin", "24h");
      } else if (filters?.date_posted === "3d") {
        url.searchParams.set("postedWithin", "3d");
      } else if (filters?.date_posted === "7d") {
        url.searchParams.set("postedWithin", "7d");
      }

      const res = await fetchWithRetry(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return { provider: this.name, jobs: [], error: `HTTP ${res.status}` };
      }

      const data = (await res.json()) as {
        jobs: RemoteBackendJob[];
        total: number;
      };

      const jobs: ProviderJob[] = (data.jobs ?? []).map((job) => ({
        external_id: `rbj-${job.id}`,
        title: job.title,
        company: job.company,
        location: job.location || "Remote",
        country: inferCountry(job.location),
        description: job.description?.slice(0, 5000) ?? "",
        application_url: job.apply_url,
        source_name: "remote_backend_jobs",
        employment_type: "full-time",
        experience_level: mapSeniority(job.seniority),
        remote_status: job.remote !== false ? "remote" : "on-site",
        published_at: job.posted_at,
        salary_min: job.salary_min ?? null,
        salary_max: job.salary_max ?? null,
        salary_currency: job.salary_currency ?? "USD",
        salary_period: "annual",
        required_skills: job.tags ?? [],
        is_mock: false,
      }));

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

function mapSeniority(seniority?: string): string {
  const s = seniority?.toLowerCase() ?? "";
  if (s.includes("junior") || s.includes("entry")) return "entry";
  if (s.includes("mid")) return "mid";
  if (s.includes("senior") || s.includes("staff") || s.includes("lead")) return "senior";
  if (s.includes("principal") || s.includes("executive")) return "executive";
  return "mid";
}
