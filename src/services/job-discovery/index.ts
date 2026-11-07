import { dedupeJobs, normalizeUrl } from "@/lib/jobs/dedupe";
import type { JobSearchFilters } from "@/types";
import { AdzunaProvider } from "../providers/adzuna";
import { AiDiscoveryProvider } from "../providers/ai-discovery";
import { ArbeitnowProvider } from "../providers/arbeitnow";
import { CareerjetProvider } from "../providers/careerjet";
import { DiceProvider } from "../providers/dice";
import { GreenhouseProvider } from "../providers/greenhouse";
import { HimalayasProvider } from "../providers/himalayas";
import { JobicyProvider } from "../providers/jobicy";
import { JoobleProvider } from "../providers/jooble";
import { LeverProvider } from "../providers/lever";
import { MockProvider } from "../providers/mock";
import { ReedProvider } from "../providers/reed";
import { RemoteOkProvider } from "../providers/remoteok";
import { RemotiveProvider } from "../providers/remotive";
import { TavilyProvider } from "../providers/tavily";
import type {
  JobProvider,
  ProviderJob,
  ProviderSearchParams,
  ProviderSearchResult,
} from "../providers/types";
import { UsaJobsProvider } from "../providers/usajobs";
import { WeWorkRemotelyProvider } from "../providers/weworkremotely";
import { WorkingNomadsProvider } from "../providers/workingnomads";

const providers: JobProvider[] = [
  new AdzunaProvider(),
  new JoobleProvider(),
  new TavilyProvider(),
  new GreenhouseProvider(),
  new LeverProvider(),
  // Public no-key boards — always active so discovery works with zero config.
  new RemotiveProvider(),
  new JobicyProvider(),
  new ArbeitnowProvider(),
  new RemoteOkProvider(),
  new HimalayasProvider(),
  new WeWorkRemotelyProvider(),
  new WorkingNomadsProvider(),
  // API-key providers (active when configured)
  new UsaJobsProvider(),
  new ReedProvider(),
  new CareerjetProvider(),
  new DiceProvider(),
  new AiDiscoveryProvider(),
];

const mockProvider = new MockProvider();

export function listProviders(): { name: string; configured: boolean }[] {
  return providers.map((p) => ({ name: p.name, configured: p.isConfigured() }));
}

function configuredProviders(): JobProvider[] {
  const active = providers.filter((p) => p.isConfigured());
  return active.length ? active : [mockProvider];
}

export interface SearchOutcome {
  jobs: ProviderJob[];
  providerResults: ProviderSearchResult[];
  usedMock: boolean;
}

/** Run all configured providers in parallel and merge + dedupe results. */
export async function discoverJobs(
  params: ProviderSearchParams,
): Promise<SearchOutcome> {
  const active = configuredProviders();
  const results = await Promise.all(active.map((p) => p.search(params)));
  const all = results.flatMap((r) => r.jobs);
  return {
    jobs: dedupeJobs(all),
    providerResults: results,
    usedMock: active.length === 1 && active[0] === mockProvider,
  };
}

// --- Post-fetch filtering on normalized fields ---

const norm = (s?: string | null) => (s ?? "").toLowerCase();

export function applyFilters(
  jobs: ProviderJob[],
  filters?: JobSearchFilters,
): ProviderJob[] {
  if (!filters) return jobs;
  return jobs.filter((j) => {
    const text = `${j.title} ${j.company} ${j.description}`.toLowerCase();

    if (filters.job_title && !text.includes(filters.job_title.toLowerCase()))
      return false;
    if (filters.company && !norm(j.company).includes(norm(filters.company)))
      return false;
    if (
      filters.location &&
      !norm(j.location).includes(norm(filters.location)) &&
      !norm(j.country).includes(norm(filters.location))
    )
      return false;
    if (filters.country && !norm(j.country).includes(norm(filters.country))) {
      // don't hard-exclude remote jobs with unknown country
      if (j.remote_status !== "remote") return false;
    }
    if (
      filters.keywords &&
      !filters.keywords
        .toLowerCase()
        .split(/\s+/)
        .every((w) => text.includes(w))
    )
      return false;
    if (filters.technology && !text.includes(filters.technology.toLowerCase()))
      return false;
    if (filters.skill && !text.includes(filters.skill.toLowerCase()))
      return false;
    if (filters.industry && !text.includes(filters.industry.toLowerCase()))
      return false;

    if (
      filters.employment_type?.length &&
      j.employment_type &&
      !filters.employment_type.includes(j.employment_type)
    )
      return false;
    if (
      filters.remote_status?.length &&
      j.remote_status &&
      !filters.remote_status.includes(j.remote_status)
    )
      return false;
    if (
      filters.experience_level?.length &&
      j.experience_level &&
      !filters.experience_level.includes(j.experience_level)
    )
      return false;

    if (filters.salary_min != null) {
      const max = j.salary_max ?? j.salary_min;
      if (max != null && max < filters.salary_min) return false;
    }
    if (
      filters.salary_max != null &&
      j.salary_min != null &&
      j.salary_min > filters.salary_max
    )
      return false;

    if (filters.date_posted) {
      const days = { "24h": 1, "7d": 7, "30d": 30 }[filters.date_posted];
      if (days && j.published_at) {
        const age =
          (Date.now() - new Date(j.published_at).getTime()) / 86400000;
        if (age > days) return false;
      }
    }
    if (filters.worldwide_remote && j.remote_status !== "remote") return false;

    return true;
  });
}

export function sortJobs(
  jobs: ProviderJob[],
  sort: "relevance" | "newest" | "salary_desc" | "salary_asc",
): ProviderJob[] {
  const arr = [...jobs];
  switch (sort) {
    case "newest":
      return arr.sort((a, b) =>
        (b.published_at ?? "").localeCompare(a.published_at ?? ""),
      );
    case "salary_desc":
      return arr.sort(
        (a, b) =>
          (b.salary_max ?? b.salary_min ?? 0) -
          (a.salary_max ?? a.salary_min ?? 0),
      );
    case "salary_asc":
      return arr.sort(
        (a, b) =>
          (a.salary_min ?? a.salary_max ?? Infinity) -
          (b.salary_min ?? b.salary_max ?? Infinity),
      );
    default:
      return arr;
  }
}

export { normalizeUrl };
