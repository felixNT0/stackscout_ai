import { config } from "@/config";
import type { JobProvider, ProviderJob, ProviderSearchParams, ProviderSearchResult } from "../types";
import { fetchWithRetry, stripHtml } from "../http";

/** Jooble job search API — POST https://jooble.org/api/{key} */
export class JoobleProvider implements JobProvider {
  readonly name = "jooble";

  isConfigured() {
    return Boolean(config.jooble.apiKey);
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.isConfigured()) {
      return { provider: this.name, jobs: [], error: "JOOBLE_API_KEY not configured" };
    }
    const { query, filters, pageSize = 20 } = params;
    const keywords = [query, filters?.keywords, filters?.technology, filters?.skill]
      .filter(Boolean)
      .join(" ");
    const location = filters?.location ?? "";

    try {
      const res = await fetchWithRetry(`https://jooble.org/api/${config.jooble.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywords || query,
          location,
          page: "1",
        }),
      });
      if (!res.ok) {
        return { provider: this.name, jobs: [], error: `Jooble HTTP ${res.status}` };
      }
      const data = await res.json();
      const jobs: ProviderJob[] = (data.jobs ?? [])
        .slice(0, pageSize)
        .map((r: Record<string, unknown>) => ({
          external_id: String(r.id ?? ""),
          title: String(r.title ?? "Untitled"),
          company: String(r.company ?? "Unknown"),
          description: stripHtml(String(r.snippet ?? "")),
          location: String(r.location ?? "") || null,
          remote_status: /remote/i.test(`${r.title} ${r.location}`) ? "remote" : null,
          employment_type: mapJoobleType(r.type as string | undefined),
          salary_min: typeof r.salary === "number" ? r.salary : null,
          salary_max: null,
          salary_currency: r.salary ? "USD" : null,
          salary_period: r.salary ? "annual" : null,
          application_url: String(r.link ?? ""),
          source_name: "jooble",
          source_url: String(r.link ?? ""),
          published_at: r.updated ? new Date(String(r.updated)).toISOString() : null,
          raw: r,
        }))
        .filter((j: ProviderJob) => j.application_url);
      return { provider: this.name, jobs, total: jobs.length };
    } catch (err) {
      return { provider: this.name, jobs: [], error: err instanceof Error ? err.message : "Jooble search failed" };
    }
  }
}

function mapJoobleType(type?: string): string | null {
  const t = (type || "").toLowerCase();
  if (t.includes("part")) return "part-time";
  if (t.includes("contract") || t.includes("freelance")) return "contract";
  if (t.includes("intern")) return "internship";
  if (t.includes("temp")) return "temporary";
  return t ? "full-time" : null;
}
