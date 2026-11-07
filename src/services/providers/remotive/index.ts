import { fetchWithRetry, stripHtml } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

/**
 * Remotive public job board API — no API key required.
 * GET https://remotive.com/api/remote-jobs?search=<q>&limit=<n>
 * Remote-friendly jobs worldwide.
 */
export class RemotiveProvider implements JobProvider {
  readonly name = "remotive";

  isConfigured() {
    return true; // public API, no key needed
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const { query, filters, pageSize = 25 } = params;
    const search =
      [query, filters?.keywords, filters?.technology, filters?.skill]
        .filter(Boolean)
        .join(" ") || query;

    try {
      const url = new URL("https://remotive.com/api/remote-jobs");
      url.searchParams.set("search", search);
      url.searchParams.set("limit", String(Math.min(pageSize, 100)));
      const res = await fetchWithRetry(url.toString());
      if (!res.ok) {
        return {
          provider: this.name,
          jobs: [],
          error: `Remotive HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as { jobs?: Record<string, unknown>[] };
      const jobs: ProviderJob[] = (data.jobs ?? [])
        .slice(0, pageSize)
        .map((r) => ({
          external_id: r.id != null ? String(r.id) : null,
          title: String(r.title ?? "Untitled"),
          company: String(r.company_name ?? "Unknown"),
          description: stripHtml(String(r.description ?? "")),
          required_skills: Array.isArray(r.tags)
            ? (r.tags as unknown[]).map(String)
            : undefined,
          location: String(r.candidate_required_location ?? "") || "Remote",
          country: null,
          remote_status: "remote" as const,
          employment_type: mapJobType(r.job_type as string | undefined),
          salary_min: parseSalaryAmount(r.salary, "min"),
          salary_max: parseSalaryAmount(r.salary, "max"),
          salary_currency: parseSalaryMeta(r.salary, "currency") as
            | string
            | null,
          salary_period: parseSalaryMeta(r.salary, "period") as
            | ProviderJob["salary_period"]
            | null,
          application_url: String(r.url ?? ""),
          source_name: "remotive",
          source_url: String(r.url ?? ""),
          published_at: r.publication_date
            ? new Date(String(r.publication_date)).toISOString()
            : null,
          raw: r,
        }))
        .filter((j) => j.application_url);
      return { provider: this.name, jobs, total: jobs.length };
    } catch (err) {
      return {
        provider: this.name,
        jobs: [],
        error: err instanceof Error ? err.message : "Remotive search failed",
      };
    }
  }
}

/** Remotive salary is a display string like "$80k - $120k" or "Competitive". */
function parseSalaryAmount(
  salary: unknown,
  part: "min" | "max",
): number | null {
  if (typeof salary !== "string" || !salary.trim()) return null;
  const amounts = [...salary.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*([kK])?/g)]
    .map((m) => {
      const n = parseFloat(m[1].replace(/,/g, ""));
      return m[2] ? n * 1000 : n;
    })
    .filter((n) => n > 100);
  if (!amounts.length) return null;
  return part === "min" ? Math.min(...amounts) : Math.max(...amounts);
}

function parseSalaryMeta(
  salary: unknown,
  part: "currency" | "period",
): string | null {
  if (typeof salary !== "string" || !salary.trim()) return null;
  if (part === "currency") {
    const m = salary.match(/[$€£₹]/);
    return m
      ? ({ $: "USD", "€": "EUR", "£": "GBP", "₹": "INR" }[m[0]] ?? "USD")
      : null;
  }
  if (/\/\s*(yr|year|annual)/i.test(salary)) return "annual";
  if (/\/\s*(mo|month)/i.test(salary)) return "monthly";
  if (/\/\s*(hr|hour)/i.test(salary)) return "hourly";
  return null;
}

function mapJobType(type?: string): string | null {
  const t = (type ?? "").toLowerCase();
  if (t.includes("part")) return "part-time";
  if (t.includes("contract")) return "contract";
  if (t.includes("intern")) return "internship";
  if (t.includes("temp")) return "temporary";
  if (t.includes("full") || t.includes("permanent")) return "full-time";
  return t || null;
}
