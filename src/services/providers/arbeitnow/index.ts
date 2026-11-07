import { fetchWithRetry, stripHtml } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

/**
 * Arbeitnow free public job board API — no API key required.
 * GET https://www.arbeitnow.com/api/job-board-api
 * Europe-heavy but includes remote roles; query filtering is client-side.
 */
export class ArbeitnowProvider implements JobProvider {
  readonly name = "arbeitnow";

  isConfigured() {
    return true; // public API, no key needed
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const { query, filters, pageSize = 25 } = params;
    const terms = (
      [query, filters?.keywords, filters?.technology, filters?.skill]
        .filter(Boolean)
        .join(" ") || query
    )
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    try {
      const res = await fetchWithRetry(
        "https://www.arbeitnow.com/api/job-board-api",
      );
      if (!res.ok) {
        return {
          provider: this.name,
          jobs: [],
          error: `Arbeitnow HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as {
        data?: Record<string, unknown>[];
      };
      const jobs: ProviderJob[] = (data.data ?? [])
        .filter((r) => {
          if (!terms.length) return true;
          // Broad recall: any significant term in title/company/tags. The
          // downstream applyFilters pass narrows results precisely.
          const hay =
            `${r.title} ${r.company_name} ${(r.tags as unknown[])?.join?.(" ") ?? ""}`.toLowerCase();
          return terms.some((t) => hay.includes(t));
        })
        .slice(0, pageSize)
        .map((r) => ({
          external_id: r.slug != null ? String(r.slug) : null,
          title: String(r.title ?? "Untitled"),
          company: String(r.company_name ?? "Unknown"),
          description: stripHtml(String(r.description ?? "")),
          required_skills: Array.isArray(r.tags)
            ? (r.tags as unknown[]).map(String)
            : undefined,
          location: String(r.location ?? "") || null,
          remote_status: r.remote ? ("remote" as const) : null,
          employment_type: mapJobTypes(r.job_types),
          application_url: String(r.url ?? ""),
          source_name: "arbeitnow",
          source_url: String(r.url ?? ""),
          published_at:
            typeof r.created_at === "number"
              ? new Date(r.created_at * 1000).toISOString()
              : null,
          raw: r,
        }))
        .filter((j) => j.application_url);
      return { provider: this.name, jobs, total: jobs.length };
    } catch (err) {
      return {
        provider: this.name,
        jobs: [],
        error: err instanceof Error ? err.message : "Arbeitnow search failed",
      };
    }
  }
}

function mapJobTypes(types: unknown): string | null {
  if (!Array.isArray(types) || !types.length) return null;
  const t = types.map(String).join(" ").toLowerCase();
  if (t.includes("part")) return "part-time";
  if (t.includes("contract")) return "contract";
  if (t.includes("intern")) return "internship";
  if (t.includes("temp")) return "temporary";
  return "full-time";
}
