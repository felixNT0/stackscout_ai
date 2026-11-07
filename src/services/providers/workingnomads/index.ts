import { fetchJson } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

interface WnJob {
  url: string;
  title: string;
  description: string;
  company_name: string;
  category_name: string;
  tags: string;
  location: string;
  pub_date: string;
}

export class WorkingNomadsProvider implements JobProvider {
  readonly name = "workingnomads";

  isConfigured() {
    return true; // No API key needed
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    try {
      const url = new URL("https://www.workingnomads.com/api/exposed_jobs/");
      if (params.query) url.searchParams.set("search", params.query);

      const data = await fetchJson<WnJob[]>(url.toString());
      const jobs: ProviderJob[] = (Array.isArray(data) ? data : []).map(
        (j) => ({
          external_id: j.url,
          title: j.title,
          company: j.company_name ?? "Unknown",
          description: j.description?.slice(0, 5000) ?? "",
          location: j.location ?? "Remote",
          remote_status: "remote",
          employment_type: null,
          application_url: j.url ?? "",
          source_name: "workingnomads",
          source_url: j.url ?? null,
          published_at: j.pub_date ?? null,
          required_skills: j.tags ? j.tags.split(",").map((t) => t.trim()) : [],
          preferred_skills: [],
        }),
      );

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
