import { config } from "@/config";
import { fetchWithRetry, stripHtml } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

const ADZUNA_COUNTRIES = new Set([
  "at",
  "au",
  "be",
  "br",
  "ca",
  "ch",
  "de",
  "es",
  "fr",
  "gb",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "pt",
  "se",
  "sg",
  "us",
  "za",
]);

function normalizeCountry(country?: string): string {
  const c = (country || "us").toLowerCase();
  return ADZUNA_COUNTRIES.has(c) ? c : "us";
}

/** Adzuna job search API — real structured vacancy data. */
export class AdzunaProvider implements JobProvider {
  readonly name = "adzuna";

  isConfigured() {
    return Boolean(config.adzuna.appId && config.adzuna.apiKey);
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.isConfigured()) {
      return {
        provider: this.name,
        jobs: [],
        error: "ADZUNA_APP_ID/ADZUNA_API_KEY not configured",
      };
    }
    const { query, filters, page = 1, pageSize = 20, country } = params;
    const cc = normalizeCountry(country ?? filters?.country);
    const what = [query, filters?.keywords, filters?.technology, filters?.skill]
      .filter(Boolean)
      .join(" ");
    const where = filters?.location || undefined;

    const url = new URL(
      `https://api.adzuna.com/v1/api/jobs/${cc}/search/${page}`,
    );
    url.searchParams.set("app_id", config.adzuna.appId);
    url.searchParams.set("app_key", config.adzuna.apiKey);
    url.searchParams.set("results_per_page", String(Math.min(pageSize, 50)));
    url.searchParams.set("what", what || query);
    url.searchParams.set("content-type", "application/json");
    if (where) url.searchParams.set("where", where);
    if (filters?.remote_status?.includes("remote"))
      url.searchParams.set("what_exclude", "on-site");
    if (filters?.salary_min)
      url.searchParams.set("salary_min", String(filters.salary_min));
    if (filters?.salary_max)
      url.searchParams.set("salary_max", String(filters.salary_max));

    try {
      const res = await fetchWithRetry(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        return {
          provider: this.name,
          jobs: [],
          error: `Adzuna HTTP ${res.status}`,
        };
      }
      const data = await res.json();
      const jobs: ProviderJob[] = (data.results ?? [])
        .map((r: Record<string, unknown>) => {
          const cat = (r.category as { label?: string } | undefined)?.label;
          return {
            external_id: String(r.id ?? ""),
            title: String(r.title ?? "Untitled"),
            company: String(
              (r.company as { display_name?: string })?.display_name ??
                "Unknown",
            ),
            company_logo: (r.company as { logo?: string })?.logo ?? null,
            description: stripHtml(String(r.description ?? "")),
            location:
              [
                r.location,
                (r.location as { display_name?: string })?.display_name,
              ]
                .filter(Boolean)
                .map(String)
                .join(", ") || null,
            country: cc.toUpperCase(),
            remote_status: /remote/i.test(String(r.title)) ? "remote" : null,
            employment_type: mapAdzunaContract(
              r.contract_type as string | undefined,
              cat,
            ),
            salary_min: typeof r.salary_min === "number" ? r.salary_min : null,
            salary_max: typeof r.salary_max === "number" ? r.salary_max : null,
            salary_currency: null,
            salary_period: "annual",
            application_url: String(r.redirect_url ?? r.absolute_url ?? ""),
            source_name: "adzuna",
            source_url: String(r.absolute_url ?? ""),
            published_at: r.created
              ? new Date(String(r.created)).toISOString()
              : null,
            raw: r,
          };
        })
        .filter((j: ProviderJob) => j.application_url);
      return { provider: this.name, jobs, total: data.count ?? jobs.length };
    } catch (err) {
      return {
        provider: this.name,
        jobs: [],
        error: err instanceof Error ? err.message : "Adzuna search failed",
      };
    }
  }
}

function mapAdzunaContract(
  contract?: string,
  category?: string,
): string | null {
  const c = (contract || "").toLowerCase();
  if (c.includes("part")) return "part-time";
  if (c.includes("contract") || c.includes("temporary")) return "contract";
  if (
    category?.toLowerCase().includes("graduate") ||
    category?.toLowerCase().includes("intern")
  )
    return "internship";
  return "full-time";
}
