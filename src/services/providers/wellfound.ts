import { fetchJson, stripHtml } from "./http";
import type { JobProvider, ProviderJob, ProviderSearchParams, ProviderSearchResult } from "./types";

interface WellfoundJob {
  id: string;
  name: string;
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  salary: string;
  equity: string;
  description: string;
  url: string;
  tags: string[];
  created_at: string;
}

interface WellfoundResponse {
  jobs: WellfoundJob[];
  total: number;
}

export class WellfoundProvider implements JobProvider {
  readonly name = "Wellfound";
  private readonly baseUrl = "https://wellfound.com/api/v1/jobs";

  isConfigured(): boolean {
    // Wellfound requires API key
    return !!process.env.WELLFOUND_API_KEY;
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.isConfigured()) {
      return { provider: this.name, jobs: [], error: "WELLFOUND_API_KEY not configured" };
    }

    const { query, page = 1, pageSize = 20, filters } = params;

    const url = new URL(this.baseUrl);
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(pageSize));
    url.searchParams.set("location", filters?.location ?? "");
    url.searchParams.set("remote", filters?.remote_status?.includes("remote") ? "true" : "");

    let data: WellfoundResponse;
    try {
      data = await fetchJson<WellfoundResponse>(url.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.WELLFOUND_API_KEY}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      return { provider: this.name, jobs: [], error: err instanceof Error ? err.message : "Fetch failed" };
    }

    const jobs: ProviderJob[] = (data?.jobs ?? []).map((job: WellfoundJob) => ({
      external_id: job.id,
      title: job.title,
      company: job.company_name,
      description: stripHtml(job.description),
      location: job.location,
      remote_status: job.remote ? "remote" : null,
      employment_type: null,
      experience_level: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      salary_period: null,
      application_url: job.url,
      source_name: "Wellfound",
      source_url: job.url,
      published_at: job.created_at,
      is_mock: false,
    }));

    return {
      provider: this.name,
      jobs,
      total: data?.total ?? jobs.length,
    };
  }
}
