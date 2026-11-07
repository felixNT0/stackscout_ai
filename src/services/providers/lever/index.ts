import type { JobProvider, ProviderJob, ProviderSearchParams, ProviderSearchResult } from "../types";
import { fetchWithRetry, stripHtml } from "../http";

/**
 * Lever Postings API — public per-company endpoints.
 * GET https://api.lever.co/v0/postings/{company}?mode=json
 *
 * No global search; provide a company slug via params.companyBoard,
 * filters.company, or the LEVER_COMPANY_SLUGS env var (comma-separated).
 */
export class LeverProvider implements JobProvider {
  readonly name = "lever";

  isConfigured() {
    return true; // public API, no key required
  }

  private companies(params: ProviderSearchParams): string[] {
    const envCompanies = (process.env.LEVER_COMPANY_SLUGS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ""))
      .filter(Boolean);
    const explicit = params.companyBoard || params.filters?.company;
    if (explicit) {
      const slug = explicit.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return slug ? [slug] : [];
    }
    return envCompanies;
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const companies = this.companies(params);
    if (companies.length === 0) {
      return {
        provider: this.name,
        jobs: [],
        error: "No Lever company specified. Set LEVER_COMPANY_SLUGS or a company filter.",
      };
    }
    const all: ProviderJob[] = [];
    const errors: string[] = [];

    for (const company of companies.slice(0, 10)) {
      try {
        const res = await fetchWithRetry(
          `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`,
          { headers: { Accept: "application/json" } },
          { retries: 1 },
        );
        if (!res.ok) {
          errors.push(`${company}: HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const j of Array.isArray(data) ? data : []) {
          const cats = (j.categories ?? {}) as Record<string, string>;
          all.push({
            external_id: String(j.id ?? ""),
            title: String(j.text ?? "Untitled"),
            company,
            description: stripHtml(String(j.descriptionPlain ?? j.description ?? "")),
            location: cats.location ?? cats.allLocations ?? null,
            remote_status: /remote/i.test(`${j.text} ${cats.location ?? ""}`) ? "remote" : null,
            employment_type: cats.commitment ? mapLeverCommitment(cats.commitment) : null,
            application_url: String(j.hostedUrl ?? j.applyUrl ?? ""),
            source_name: "lever",
            source_url: String(j.hostedUrl ?? ""),
            published_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
            raw: { company, categories: cats, lists: j.lists },
          });
        }
      } catch (err) {
        errors.push(`${company}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    return {
      provider: this.name,
      jobs: all.filter((j) => j.application_url),
      total: all.length,
      error: errors.length ? errors.join("; ") : undefined,
    };
  }
}

function mapLeverCommitment(commitment: string): string | null {
  const c = commitment.toLowerCase();
  if (c.includes("part")) return "part-time";
  if (c.includes("contract") || c.includes("freelance")) return "contract";
  if (c.includes("intern")) return "internship";
  if (c.includes("temp")) return "temporary";
  return "full-time";
}
