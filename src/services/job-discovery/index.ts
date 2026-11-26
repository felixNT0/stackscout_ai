import { dedupeJobs, normalizeUrl } from "@/lib/jobs/dedupe";
import { loadUserKeys } from "@/lib/keys/store";
import type { JobSearchFilters } from "@/types";
import { AdzunaProvider } from "../providers/adzuna";
import { AiDiscoveryProvider } from "../providers/ai-discovery";
import { ArbeitnowProvider } from "../providers/arbeitnow";
import { AshbyProvider } from "../providers/ashby";
import { BuiltInChicagoProvider } from "../providers/builtinchicago";
import { CareerjetProvider } from "../providers/careerjet";
import { DiceProvider } from "../providers/dice";
import { GreenhouseProvider } from "../providers/greenhouse";
import { HimalayasProvider } from "../providers/himalayas";
import { JobicyProvider } from "../providers/jobicy";
import { JoobleProvider } from "../providers/jooble";
import { LeverProvider } from "../providers/lever";
import { MockProvider } from "../providers/mock";
import { ReedProvider } from "../providers/reed";
import { RemoteBackendJobsProvider } from "../providers/remotebackendjobs";
import { RemoteOkProvider } from "../providers/remoteok";
import { RemotiveProvider } from "../providers/remotive";
import { SimplyHiredProvider } from "../providers/simplyhired";
import { TavilyProvider } from "../providers/tavily";
import { TheMuseProvider } from "../providers/themuse";
import type {
    JobProvider,
    ProviderJob,
    ProviderSearchParams,
    ProviderSearchResult,
} from "../providers/types";
import { UsaJobsProvider } from "../providers/usajobs";
import { WellfoundProvider } from "../providers/wellfound";
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
  new TheMuseProvider(),
  new RemoteBackendJobsProvider(),
  new AshbyProvider(),
  new SimplyHiredProvider(),
  new BuiltInChicagoProvider(),
  // API-key providers (active when configured)
  new UsaJobsProvider(),
  new ReedProvider(),
  new CareerjetProvider(),
  new DiceProvider(),
  new WellfoundProvider(),
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
  // Preload the user's integration keys so provider isConfigured()/search()
  // can resolve per-user credentials synchronously.
  await loadUserKeys().catch(() => new Map());
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

/** Canonicalize employment types across provider vocabularies. */
export function normEmploymentType(t?: string | null): string {
  const v = norm(t).replace(/[\s_]+/g, "-");
  if (!v) return "";
  if (v.includes("full") || v.includes("permanent")) return "full-time";
  if (v.includes("part")) return "part-time";
  if (v.includes("contract")) return "contract";
  if (v.includes("freelance") || v.includes("consult")) return "freelance";
  if (v.includes("intern")) return "internship";
  if (v.includes("temp")) return "temporary";
  return v;
}

/** Canonicalize remote status values. */
export function normRemoteStatus(s?: string | null): string {
  const v = norm(s).replace(/[\s_]+/g, "-");
  if (!v) return "";
  if (v.includes("remote") || v.includes("wfh") || v.includes("work-from-home"))
    return "remote";
  if (v.includes("hybrid")) return "hybrid";
  if (
    v.includes("on-site") ||
    v.includes("onsite") ||
    v.includes("office") ||
    v.includes("onprem")
  )
    return "on-site";
  return v;
}

/** Canonicalize experience levels (providers emit coarser vocabularies). */
export function normExperienceLevel(l?: string | null): string {
  const v = norm(l).replace(/[\s_]+/g, "-");
  if (!v) return "";
  if (v.includes("executive") || v.includes("director") || v.includes("vp") || v.includes("head"))
    return "director";
  if (v.includes("principal")) return "principal";
  if (v.includes("lead") || v.includes("staff")) return "lead";
  if (v.includes("senior") || v.includes("sr")) return "senior";
  if (v.includes("mid") || v.includes("middle")) return "mid";
  if (v.includes("junior") || v.includes("jr")) return "junior";
  if (v.includes("entry") || v.includes("associate") || v.includes("graduate")) return "entry";
  if (v.includes("intern")) return "internship";
  return v;
}

/** Normalize a filter value the same way as job values for comparison. */
function normFilterValue(kind: "employment" | "remote" | "experience", v: string): string {
  if (kind === "employment") return normEmploymentType(v);
  if (kind === "remote") return normRemoteStatus(v);
  return normExperienceLevel(v);
}

export function applyFilters(
  jobs: ProviderJob[],
  filters?: JobSearchFilters,
): ProviderJob[] {
  if (!filters) return jobs;

  // Pre-normalize enum filter lists once
  const empFilters = filters.employment_type?.map((v) =>
    normFilterValue("employment", v),
  );
  const remoteFilters = filters.remote_status?.map((v) =>
    normFilterValue("remote", v),
  );
  const expFilters = filters.experience_level?.map((v) =>
    normFilterValue("experience", v),
  );

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
      if (normRemoteStatus(j.remote_status) !== "remote") return false;
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

    if (empFilters?.length && j.employment_type) {
      const jt = normEmploymentType(j.employment_type);
      // Exclude only when the job's type is known and doesn't match
      if (jt && !empFilters.includes(jt)) return false;
    }
    if (remoteFilters?.length && j.remote_status) {
      const jr = normRemoteStatus(j.remote_status);
      if (jr && !remoteFilters.includes(jr)) return false;
    }
    if (expFilters?.length && j.experience_level) {
      const je = normExperienceLevel(j.experience_level);
      if (je && !expFilters.includes(je)) return false;
    }

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
    if (filters.max_age_days != null && j.published_at) {
      const age =
        (Date.now() - new Date(j.published_at).getTime()) / 86400000;
      if (age > filters.max_age_days) return false;
    }
    if (filters.worldwide_remote && normRemoteStatus(j.remote_status) !== "remote")
      return false;

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
      // Shuffle to vary results across searches while keeping it deterministic
      // within a session by seeding with the current hour
      const seed = Math.floor(Date.now() / 3600000); // changes hourly
      return arr
        .map((j, i) => ({ j, i, r: (i * 9301 + 49297 + seed) % 233280 }))
        .sort((a, b) => a.r - b.r)
        .map(({ j }) => j);
  }
}

export { normalizeUrl };
