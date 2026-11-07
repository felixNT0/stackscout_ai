import type { ProviderJob } from "@/services/providers/types";

/** Strip tracking params and normalize a URL for comparison. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const tracked = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source",
      "fbclid",
      "gclid",
    ];
    tracked.forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Content fingerprint: company + title + location. */
export function jobFingerprint(
  j: Pick<ProviderJob, "title" | "company" | "location">,
): string {
  const titleWords = normalizeText(j.title).split(" ").slice(0, 8).join(" ");
  return `${normalizeText(j.company)}|${titleWords}|${normalizeText(j.location ?? "")}`;
}

function dedupeKey(j: ProviderJob): string {
  // Fingerprint (company+title+location) is primary: the same vacancy appears on
  // multiple platforms with different URLs. URL is the fallback for sparse records.
  if (j.company && j.title) return `fp:${jobFingerprint(j)}`;
  const url = j.application_url ? normalizeUrl(j.application_url) : "";
  if (url && !url.includes("example.com")) return `url:${url}`;
  if (j.external_id && j.source_name !== "demo")
    return `ext:${j.source_name}:${j.external_id}`;
  return `fp:${jobFingerprint(j)}`;
}

/** Stable hash for fingerprint-based external IDs. */
export function fingerprintId(
  j: Pick<ProviderJob, "title" | "company" | "location" | "application_url">,
): string {
  const src = `${jobFingerprint(j)}|${normalizeUrl(j.application_url)}`;
  let h = 0;
  for (let i = 0; i < src.length; i++)
    h = (Math.imul(31, h) + src.charCodeAt(i)) | 0;
  return `fp-${(h >>> 0).toString(36)}`;
}

/**
 * Deduplicate provider results. Prefers real providers over mocks and
 * records all source names seen for traceability.
 */
export function dedupeJobs(jobs: ProviderJob[]): ProviderJob[] {
  const map = new Map<string, ProviderJob & { _sources: Set<string> }>();
  for (const job of jobs) {
    if (!job.title || !job.application_url) continue;
    const key = dedupeKey(job);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...job, _sources: new Set([job.source_name]) });
      continue;
    }
    existing._sources.add(job.source_name);
    // Prefer non-mock, richer records
    const score = (j: ProviderJob) =>
      (j.is_mock ? 0 : 100) +
      (j.description?.length ?? 0) / 100 +
      (j.salary_min ? 10 : 0) +
      (j.remote_status ? 5 : 0);
    if (score(job) > score(existing)) {
      const sources = existing._sources;
      map.set(key, { ...job, _sources: sources });
    }
  }
  return Array.from(map.values()).map(({ _sources, ...j }) => ({
    ...j,
    raw: {
      ...(typeof j.raw === "object" && j.raw ? j.raw : {}),
      sources: Array.from(_sources),
    },
  }));
}
