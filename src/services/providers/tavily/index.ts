import { config } from "@/config";
import type { JobProvider, ProviderJob, ProviderSearchParams, ProviderSearchResult } from "../types";
import { fetchWithRetry, stripHtml } from "../http";

/**
 * Tavily web search — discovers job pages and company career pages.
 * Results are discovery LEADS, not verified vacancies: they point at real
 * pages but may be articles, aggregators, or stale listings.
 */
export class TavilyProvider implements JobProvider {
  readonly name = "tavily";

  isConfigured() {
    return Boolean(config.tavily.apiKey);
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.isConfigured()) {
      return { provider: this.name, jobs: [], error: "TAVILY_API_KEY not configured" };
    }
    const { query, filters, pageSize = 10 } = params;
    const q = [
      query,
      filters?.job_title,
      filters?.location,
      filters?.remote_status?.includes("remote") ? "remote" : "",
      "job vacancy careers apply",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const res = await fetchWithRetry("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: config.tavily.apiKey,
          query: q.slice(0, 400),
          search_depth: "basic",
          max_results: Math.min(pageSize, 10),
          include_domains: undefined,
        }),
      });
      if (!res.ok) {
        return { provider: this.name, jobs: [], error: `Tavily HTTP ${res.status}` };
      }
      const data = await res.json();
      const jobs: ProviderJob[] = (data.results ?? [])
        .filter((r: { url?: string }) => r.url)
        .map((r: { title?: string; url: string; content?: string; published_date?: string }) => ({
          external_id: null,
          title: r.title || "Job listing",
          company: "Unknown company",
          description: stripHtml(r.content || ""),
          location: filters?.location ?? null,
          application_url: r.url,
          source_name: "tavily",
          source_url: r.url,
          published_at: r.published_date ?? null,
          raw: { tavily: true, discovery_lead: true },
        }));
      return { provider: this.name, jobs, total: jobs.length };
    } catch (err) {
      return { provider: this.name, jobs: [], error: err instanceof Error ? err.message : "Tavily search failed" };
    }
  }
}
