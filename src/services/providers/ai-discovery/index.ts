import { config } from "@/config";
import { extractJobFromText } from "@/lib/ai/job-extraction";
import { expandSearchQuery } from "@/lib/ai/query-expansion";
import { fetchText, fetchWithRetry, stripHtml } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

/**
 * AI-powered job discovery — uses Tavily web search + AI extraction
 * to find job postings from across the web, including sites without APIs.
 */
export class AiDiscoveryProvider implements JobProvider {
  readonly name = "ai-discovery";

  isConfigured() {
    return Boolean(config.tavily.apiKey && config.openai.apiKey);
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.isConfigured()) {
      return {
        provider: this.name,
        jobs: [],
        error: "Requires TAVILY_API_KEY and OPENAI_API_KEY",
      };
    }

    const { query, filters, pageSize = 10 } = params;
    const jobs: ProviderJob[] = [];

    try {
      // Expand query with AI to find more results
      const expanded = await expandSearchQuery(query);
      const searchQueries = [
        query,
        ...expanded.expanded.slice(0, 2), // Top 2 expansions
      ];

      // Search Tavily for each query variant
      const allResults: Array<{
        title?: string;
        url: string;
        content?: string;
        published_date?: string;
      }> = [];

      for (const q of searchQueries.slice(0, 3)) {
        const searchQuery = [
          q,
          filters?.location,
          filters?.remote_status?.includes("remote") ? "remote" : "",
          "job posting vacancy apply",
        ]
          .filter(Boolean)
          .join(" ");

        const res = await fetchWithRetry("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: config.tavily.apiKey,
            query: searchQuery.slice(0, 400),
            search_depth: "advanced",
            max_results: Math.min(5, pageSize),
            include_answer: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          allResults.push(...(data.results ?? []));
        }
      }

      // Deduplicate by URL
      const seen = new Set<string>();
      const uniqueResults = allResults.filter((r) => {
        if (!r.url || seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      // Extract job data from top results
      for (const result of uniqueResults.slice(0, pageSize)) {
        try {
          // Fetch the page content for better extraction
          const pageText = await fetchText(result.url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; StackScoutAI/1.0; +https://stackscout.ai)",
            },
          }).catch(() => result.content ?? "");

          const text = stripHtml(pageText || result.content || "");
          const extracted = await extractJobFromText(text, result.url);

          if (extracted && extracted.title) {
            const remoteStatus = ["remote", "hybrid", "on-site"].includes(
              extracted.remote_status ?? "",
            )
              ? (extracted.remote_status as "remote" | "hybrid" | "on-site")
              : null;
            jobs.push({
              external_id: result.url,
              title: extracted.title,
              company: extracted.company || "Unknown",
              description: extracted.description?.slice(0, 5000) ?? "",
              location: extracted.location ?? filters?.location ?? null,
              remote_status: remoteStatus,
              employment_type: extracted.employment_type ?? null,
              salary_min: extracted.salary_min ?? null,
              salary_max: extracted.salary_max ?? null,
              salary_currency: extracted.salary_currency ?? null,
              application_url: extracted.application_url || result.url,
              source_name: this.name,
              source_url: result.url,
              published_at: result.published_date ?? null,
              required_skills: extracted.required_skills ?? [],
              preferred_skills: extracted.preferred_skills ?? [],
            });
          }
        } catch {
          // Skip failed extractions
        }
      }

      return { provider: this.name, jobs, total: jobs.length };
    } catch (error) {
      return {
        provider: this.name,
        jobs: [],
        error: error instanceof Error ? error.message : "AI discovery failed",
      };
    }
  }
}
