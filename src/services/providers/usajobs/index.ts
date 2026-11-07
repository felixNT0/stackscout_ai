import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";
import { fetchJson } from "../http";

interface UsaJob {
  MatchedObjectId: string;
  MatchedObjectDescriptor: {
    PositionTitle: string;
    OrganizationName: string;
    PositionLocationDisplay: string;
    PositionURI: string;
    PositionFormattedDescription?: string;
    PublicationStartDate: string;
    PositionRemuneration?: Array<{
      MinimumRange?: string;
      MaximumRange?: string;
      RateIntervalCode?: string;
    }>;
    JobCategory?: Array<{ Name: string }>;
    UserArea?: {
      Details?: {
        JobSummary?: string;
        WhoMayApply?: { Name: string };
        DegreeRequirement?: string;
      };
    };
  };
}

export class UsaJobsProvider implements JobProvider {
  readonly name = "usajobs";

  isConfigured() {
    return Boolean(process.env.USAJOBS_API_KEY);
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const apiKey = process.env.USAJOBS_API_KEY;
    if (!apiKey) {
      return { provider: this.name, jobs: [], error: "USAJOBS_API_KEY not set" };
    }

    try {
      const url = new URL("https://data.usajobs.gov/api/search");
      url.searchParams.set("Keyword", params.query);
      url.searchParams.set("ResultsPerPage", "50");
      if (params.page) url.searchParams.set("Page", String(params.page));
      if (params.filters?.location) url.searchParams.set("LocationName", params.filters.location);

      const data = await fetchJson<{ SearchResult: { SearchResultItems: { MatchedObject: UsaJob[] } } }>(
        url.toString(),
        {
          headers: {
            "User-Agent": "StackScoutAI/1.0 (contact@stackscout.ai)",
            "Authorization-Key": apiKey,
          },
        },
      );

      const jobs: ProviderJob[] = (data.SearchResult?.SearchResultItems?.MatchedObject ?? []).map((j) => {
        const d = j.MatchedObjectDescriptor;
        const salary = d.PositionRemuneration?.[0];
        return {
          external_id: j.MatchedObjectId,
          title: d.PositionTitle ?? "Unknown",
          company: d.OrganizationName ?? "US Government",
          description: d.PositionFormattedDescription?.slice(0, 5000) ?? d.UserArea?.Details?.JobSummary ?? "",
          location: d.PositionLocationDisplay ?? null,
          remote_status: null,
          employment_type: "full-time",
          salary_min: salary?.MinimumRange ? parseFloat(salary.MinimumRange) : null,
          salary_max: salary?.MaximumRange ? parseFloat(salary.MaximumRange) : null,
          salary_currency: "USD",
          salary_period: salary?.RateIntervalCode === "PA" ? "annual" : null,
          application_url: d.PositionURI ?? "",
          source_name: "usajobs",
          source_url: d.PositionURI ?? null,
          published_at: d.PublicationStartDate ?? null,
          required_skills: [],
          preferred_skills: [],
        };
      });

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
