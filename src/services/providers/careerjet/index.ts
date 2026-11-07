import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";
import { fetchJson } from "../http";

interface CareerjetJob {
  url: string;
  title: string;
  company: string;
  locations: string;
  description: string;
  salary: string;
  date: string;
  site: string;
}

export class CareerjetProvider implements JobProvider {
  readonly name = "careerjet";

  isConfigured() {
    return Boolean(process.env.CAREERJET_AFFID);
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const affid = process.env.CAREERJET_AFFID;
    if (!affid) {
      return { provider: this.name, jobs: [], error: "CAREERJET_AFFID not set" };
    }

    try {
      const url = new URL("https://public.api.careerjet.net/search");
      url.searchParams.set("keywords", params.query);
      url.searchParams.set("location", params.filters?.location ?? "us");
      url.searchParams.set("pagesize", "50");
      url.searchParams.set("locale_code", "en_US");
      url.searchParams.set("affid", affid);
      if (params.page) url.searchParams.set("page", String(params.page));

      const data = await fetchJson<{ jobs: CareerjetJob[] }>(url.toString());
      const jobs: ProviderJob[] = (data.jobs ?? []).map((j) => ({
        external_id: j.url,
        title: j.title,
        company: j.company ?? "Unknown",
        description: j.description?.slice(0, 5000) ?? "",
        location: j.locations ?? null,
        remote_status: null,
        employment_type: null,
        application_url: j.url ?? "",
        source_name: "careerjet",
        source_url: j.url ?? null,
        published_at: j.date ?? null,
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
