import { fetchWithRetry, stripHtml } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

/**
 * Jobicy public API — no API key required.
 * GET https://jobicy.com/api/v2/remote-jobs?count=<n>&tag=<q>
 * Remote jobs worldwide.
 */
export class JobicyProvider implements JobProvider {
  readonly name = "jobicy";

  isConfigured() {
    return true; // public API, no key needed
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const { query, filters, pageSize = 25 } = params;
    // Jobicy's `tag` filter expects a single tag/keyword — use the most
    // specific term rather than the whole query string.
    const tag =
      [query, filters?.keywords, filters?.technology, filters?.skill]
        .filter(Boolean)
        .join(" ")
        .split(/\s+/)
        .find((w) => w.length > 2) ?? query;

    try {
      const url = new URL("https://jobicy.com/api/v2/remote-jobs");
      url.searchParams.set("count", String(Math.min(pageSize, 50)));
      url.searchParams.set("tag", tag);
      const res = await fetchWithRetry(url.toString());
      if (!res.ok) {
        return {
          provider: this.name,
          jobs: [],
          error: `Jobicy HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as { jobs?: Record<string, unknown>[] };
      const jobs: ProviderJob[] = (data.jobs ?? [])
        .slice(0, pageSize)
        .map((r) => ({
          external_id: r.id != null ? String(r.id) : null,
          title: String(r.jobTitle ?? "Untitled"),
          company: String(r.companyName ?? "Unknown"),
          company_logo: (r.companyLogo as string) || null,
          description: stripHtml(
            String(r.jobDescription ?? r.jobExcerpt ?? ""),
          ),
          required_skills: r.jobIndustry ? [String(r.jobIndustry)] : undefined,
          location: String(r.jobGeo ?? "") || "Remote",
          remote_status: "remote" as const,
          employment_type: mapJobType(r.jobType),
          experience_level: mapLevel(r.jobLevel as string | undefined),
          salary_min: typeof r.salaryMin === "number" ? r.salaryMin : null,
          salary_max: typeof r.salaryMax === "number" ? r.salaryMax : null,
          salary_currency:
            typeof r.salaryCurrency === "string" && r.salaryCurrency
              ? r.salaryCurrency
              : null,
          salary_period:
            (r.salaryPeriod as ProviderJob["salary_period"]) ?? null,
          application_url: String(r.url ?? ""),
          source_name: "jobicy",
          source_url: String(r.url ?? ""),
          published_at: r.pubDate
            ? new Date(
                typeof r.pubDate === "number" ? r.pubDate : String(r.pubDate),
              ).toISOString()
            : null,
          raw: r,
        }))
        .filter((j) => j.application_url);
      return { provider: this.name, jobs, total: jobs.length };
    } catch (err) {
      return {
        provider: this.name,
        jobs: [],
        error: err instanceof Error ? err.message : "Jobicy search failed",
      };
    }
  }
}

function mapJobType(type: unknown): string | null {
  // jobType is an array like ["Full-Time"] or a plain string
  const t = (
    Array.isArray(type) ? type.join(" ") : String(type ?? "")
  ).toLowerCase();
  if (t.includes("part")) return "part-time";
  if (t.includes("contract")) return "contract";
  if (t.includes("intern")) return "internship";
  if (t.includes("temp")) return "temporary";
  if (t.includes("full") || t.includes("permanent")) return "full-time";
  return t || null;
}

function mapLevel(level?: string): string | null {
  const l = (level ?? "").toLowerCase();
  if (!l) return null;
  if (l.includes("senior") || l.includes("lead")) return "senior";
  if (l.includes("mid")) return "mid";
  if (l.includes("junior") || l.includes("entry") || l.includes("intern"))
    return "junior";
  return l;
}
