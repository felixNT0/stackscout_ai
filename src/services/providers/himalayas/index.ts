import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";
import { fetchJson } from "../http";

interface HimalayasJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  url: string;
  published_at: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
}

export class HimalayasProvider implements JobProvider {
  readonly name = "himalayas";

  isConfigured() {
    return true; // No API key needed
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    try {
      const url = new URL("https://himalayas.app/jobs/api");
      url.searchParams.set("limit", "50");
      if (params.query) url.searchParams.set("search", params.query);
      if (params.filters?.remote_status?.includes("remote")) url.searchParams.set("remote", "true");

      const data = await fetchJson<{ jobs: HimalayasJob[] }>(url.toString());
      const jobs: ProviderJob[] = (data.jobs ?? []).map((j) => ({
        external_id: j.id,
        title: j.title,
        company: j.company ?? "Unknown",
        description: j.description?.slice(0, 5000) ?? "",
        location: j.location ?? null,
        remote_status: "remote",
        employment_type: j.type?.toLowerCase() ?? null,
        salary_min: j.salary_min ?? null,
        salary_max: j.salary_max ?? null,
        salary_currency: j.salary_currency ?? null,
        application_url: j.url ?? "",
        source_name: "himalayas",
        source_url: j.url ?? null,
        published_at: j.published_at ?? null,
        required_skills: [],
        preferred_skills: [],
      }));

      return { provider: this.name, jobs, total: jobs.length };
    } catch (error) {
      return {
        provider: this.name,
        jobs: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
