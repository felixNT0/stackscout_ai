import { fetchText, stripHtml } from "./http";
import type { JobProvider, ProviderJob, ProviderSearchParams, ProviderSearchResult } from "./types";

export class SimplyHiredProvider implements JobProvider {
  readonly name = "SimplyHired";
  private readonly baseUrl = "https://www.simplyhired.com/search";

  isConfigured(): boolean {
    // SimplyHired doesn't have a public API, use their RSS feed
    return true;
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const { query, page = 1, pageSize = 20, filters } = params;

    const url = new URL(this.baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("l", filters?.location ?? "");
    url.searchParams.set("start", String((page - 1) * pageSize));

    let data: string;
    try {
      data = await fetchText(url.toString(), {
        headers: { Accept: "text/html" },
      });
    } catch (err) {
      return { provider: this.name, jobs: [], error: err instanceof Error ? err.message : "Fetch failed" };
    }

    // Parse HTML response (SimplyHired doesn't have a clean API)
    const jobs: ProviderJob[] = [];
    const jobRegex = /<div[^>]*class="[^"]*job[^"]*"[^>]*>(.*?)<\/div>/gi;
    let match;

    while ((match = jobRegex.exec(data)) !== null && jobs.length < pageSize) {
      const html = match[1];
      const titleMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
      const companyMatch = html.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/span>/i);
      const locationMatch = html.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/i);
      const urlMatch = html.match(/<a[^>]*href="([^"]*)"[^>]*>/i);

      if (titleMatch && companyMatch && urlMatch) {
        jobs.push({
          external_id: `simplyhired-${jobs.length}`,
          title: stripHtml(titleMatch[1]),
          company: stripHtml(companyMatch[1]),
          description: stripHtml(html),
          location: locationMatch ? stripHtml(locationMatch[1]) : null,
          application_url: urlMatch[1],
          source_name: "SimplyHired",
          remote_status: "remote" as const,
          employment_type: null,
          experience_level: null,
          salary_min: null,
          salary_max: null,
          salary_currency: null,
          salary_period: null,
          published_at: null,
          is_mock: false,
        });
      }
    }

    return {
      provider: this.name,
      jobs,
      total: jobs.length,
    };
  }
}
