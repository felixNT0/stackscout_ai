import { fetchWithRetry, stripHtml } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

/**
 * RemoteOK public JSON feed — no API key required.
 * GET https://remoteok.com/api
 * The first array element is a legal/metadata notice, not a job.
 */
export class RemoteOkProvider implements JobProvider {
  readonly name = "remoteok";

  isConfigured() {
    return true; // public feed, no key needed
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
      const res = await fetchWithRetry("https://remoteok.com/api", {
        headers: {
          "User-Agent":
            "StackScoutAI/1.0 (job aggregator; contact: admin@stackscout.ai)",
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        return {
          provider: this.name,
          jobs: [],
          error: `RemoteOK HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as Record<string, unknown>[];
      const jobs: ProviderJob[] = (Array.isArray(data) ? data : [])
        .filter((r) => r && typeof r === "object" && r.position)
        .filter((r) => {
          if (!terms.length) return true;
          const hay =
            `${r.position} ${r.company} ${(r.tags as unknown[])?.join?.(" ") ?? ""}`.toLowerCase();
          return terms.some((t) => hay.includes(t));
        })
        .slice(0, pageSize)
        .map((r) => {
          const id = r.id != null ? String(r.id) : null;
          return {
            external_id: id,
            title: String(r.position ?? "Untitled"),
            company: String(r.company ?? "Unknown"),
            description: stripHtml(String(r.description ?? "")),
            required_skills: Array.isArray(r.tags)
              ? (r.tags as unknown[]).map(String)
              : undefined,
            location: String(r.location ?? "") || "Remote",
            remote_status: "remote" as const,
            salary_min: typeof r.salary_min === "number" ? r.salary_min : null,
            salary_max: typeof r.salary_max === "number" ? r.salary_max : null,
            salary_currency:
              r.salary_min != null || r.salary_max != null ? "USD" : null,
            salary_period:
              r.salary_min != null || r.salary_max != null
                ? ("annual" as const)
                : null,
            application_url: String(
              r.apply_url ??
                r.url ??
                (id ? `https://remoteok.com/remote-jobs/${id}` : ""),
            ),
            source_name: "remoteok",
            source_url: String(
              r.url ?? (id ? `https://remoteok.com/remote-jobs/${id}` : ""),
            ),
            published_at: r.date
              ? new Date(String(r.date)).toISOString()
              : null,
            raw: r,
          };
        })
        .filter((j) => j.application_url);
      return { provider: this.name, jobs, total: jobs.length };
    } catch (err) {
      return {
        provider: this.name,
        jobs: [],
        error: err instanceof Error ? err.message : "RemoteOK search failed",
      };
    }
  }
}
