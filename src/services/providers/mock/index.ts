import type { JobProvider, ProviderJob, ProviderSearchParams, ProviderSearchResult } from "../types";

/**
 * Demo provider — returns clearly-labelled SAMPLE listings so the app is
 * usable before API keys are configured. Every job has is_mock=true and
 * source_name="demo"; the UI must badge these and never present them as
 * real vacancies.
 */
export class MockProvider implements JobProvider {
  readonly name = "demo";

  isConfigured() {
    return true;
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    const { query, pageSize = 10 } = params;
    const q = (query || "software engineer").trim();
    const jobs: ProviderJob[] = Array.from({ length: Math.min(pageSize, 6) }, (_, i) => ({
      external_id: `demo-${Date.now()}-${i}`,
      title: `${q} — Demo Listing ${i + 1}`,
      company: `Example Corp ${i + 1}`,
      description: `This is a DEMO listing for "${q}". It exists only to demonstrate the interface and is not a real job vacancy. Connect ADZUNA/JOOBLE/TAVILY API keys to see real results.`,
      location: params.filters?.location ?? "Remote",
      remote_status: "remote",
      employment_type: "full-time",
      application_url: "https://example.com",
      source_name: "demo",
      source_url: null,
      is_mock: true,
      raw: { demo: true },
    }));
    return { provider: this.name, jobs, total: jobs.length, mocked: true };
  }
}
