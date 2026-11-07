import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";
import { fetchJson } from "../http";

interface DiceJob {
  id: string;
  title: string;
  company: { name: string; logo?: string };
  location: { city: string; state: string; country: string };
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  employmentType: string | null;
  datePosted: string;
  url: string;
  skills: string[];
}

export class DiceProvider implements JobProvider {
  readonly name = "dice";

  isConfigured() {
    return Boolean(process.env.DICE_API_KEY);
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const apiKey = process.env.DICE_API_KEY;
    if (!apiKey) {
      return { provider: this.name, jobs: [], error: "DICE_API_KEY not set" };
    }

    try {
      const url = new URL("https://api.dice.com/jobs/search");
      url.searchParams.set("query", params.query);
      url.searchParams.set("pageSize", "50");
      if (params.page) url.searchParams.set("page", String(params.page));
      if (params.filters?.location) url.searchParams.set("location", params.filters.location);

      const data = await fetchJson<{ results: DiceJob[] }>(
        url.toString(),
        {
          headers: {
            "X-Dice-Api-Key": apiKey,
          },
        },
      );

      const jobs: ProviderJob[] = (data.results ?? []).map((j) => ({
        external_id: j.id,
        title: j.title,
        company: j.company?.name ?? "Unknown",
        company_logo: j.company?.logo ?? null,
        description: j.description?.slice(0, 5000) ?? "",
        location: j.location ? `${j.location.city}, ${j.location.state}` : null,
        remote_status: null,
        employment_type: j.employmentType?.toLowerCase() ?? null,
        salary_min: j.salaryMin ?? null,
        salary_max: j.salaryMax ?? null,
        salary_currency: j.salaryCurrency ?? null,
        application_url: j.url ?? "",
        source_name: "dice",
        source_url: j.url ?? null,
        published_at: j.datePosted ?? null,
        required_skills: j.skills ?? [],
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
