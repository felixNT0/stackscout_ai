import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";
import { fetchJson } from "../http";

interface ReedJob {
  jobId: number;
  jobTitle: string;
  employerName: string;
  locationName: string;
  minimumSalary: number | null;
  maximumSalary: number | null;
  salaryType: string | null;
  datePosted: string;
  jobDescription: string;
  jobUrl: string;
  jobCategory: string;
  contractType: string | null;
}

export class ReedProvider implements JobProvider {
  readonly name = "reed";

  isConfigured() {
    return Boolean(process.env.REED_API_KEY);
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const apiKey = process.env.REED_API_KEY;
    if (!apiKey) {
      return { provider: this.name, jobs: [], error: "REED_API_KEY not set" };
    }

    try {
      const url = new URL("https://www.reed.co.uk/api/1.0/search");
      url.searchParams.set("keywords", params.query);
      url.searchParams.set("resultsToTake", "50");
      if (params.page) url.searchParams.set("page", String(params.page));
      if (params.filters?.location) url.searchParams.set("location", params.filters.location);

      const data = await fetchJson<{ results: ReedJob[] }>(
        url.toString(),
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      const jobs: ProviderJob[] = (data.results ?? []).map((j) => ({
        external_id: String(j.jobId),
        title: j.jobTitle,
        company: j.employerName ?? "Unknown",
        description: j.jobDescription?.slice(0, 5000) ?? "",
        location: j.locationName ?? null,
        remote_status: null,
        employment_type: j.contractType?.toLowerCase() ?? null,
        salary_min: j.minimumSalary ?? null,
        salary_max: j.maximumSalary ?? null,
        salary_currency: "GBP",
        salary_period: j.salaryType === "annual" ? "annual" : null,
        application_url: j.jobUrl ?? "",
        source_name: "reed",
        source_url: j.jobUrl ?? null,
        published_at: j.datePosted ?? null,
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
