import { fetchWithRetry, stripHtml } from "../http";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../types";

/**
 * Greenhouse Job Board API — public per-company endpoints.
 * GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs
 *
 * Greenhouse has no global job search; provide a board token via
 * params.companyBoard, filters.company (slugified), or the
 * GREENHOUSE_BOARD_TOKENS env var (comma-separated) for discovery sweeps.
 */
export class GreenhouseProvider implements JobProvider {
  readonly name = "greenhouse";

  isConfigured() {
    return true; // public API, no key required
  }

  private boards(params: ProviderSearchParams): string[] {
    const envBoards = (process.env.GREENHOUSE_BOARD_TOKENS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const explicit = params.companyBoard || params.filters?.company;
    if (explicit) {
      const slug = explicit.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return slug ? [slug] : [];
    }
    return envBoards;
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const boards = this.boards(params);
    if (boards.length === 0) {
      return {
        provider: this.name,
        jobs: [],
        error:
          "No Greenhouse board specified. Set GREENHOUSE_BOARD_TOKENS or a company filter.",
      };
    }
    const all: ProviderJob[] = [];
    const errors: string[] = [];

    for (const board of boards.slice(0, 10)) {
      try {
        const res = await fetchWithRetry(
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
          { headers: { Accept: "application/json" } },
          { retries: 1 },
        );
        if (!res.ok) {
          errors.push(`${board}: HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const j of data.jobs ?? []) {
          const title = String(j.title ?? "");
          all.push({
            external_id: String(j.id ?? ""),
            title,
            company: board,
            description: stripHtml(String(j.content ?? "")),
            location: j.location?.name ?? null,
            remote_status: /remote/i.test(`${title} ${j.location?.name ?? ""}`)
              ? "remote"
              : null,
            employment_type: null,
            application_url: String(j.absolute_url ?? ""),
            source_name: "greenhouse",
            source_url: String(j.absolute_url ?? ""),
            published_at: j.updated_at ?? null,
            raw: { board, departments: j.departments, offices: j.offices },
          });
        }
      } catch (err) {
        errors.push(
          `${board}: ${err instanceof Error ? err.message : "failed"}`,
        );
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
