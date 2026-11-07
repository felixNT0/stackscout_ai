import { prisma } from "@/lib/db";
import { fingerprintId } from "@/lib/jobs/dedupe";
import type { ProviderJob } from "@/services/providers/types";
import type { Job } from "@/types";

/** Upsert discovered jobs into the shared jobs table. Returns the DB rows. */
export async function persistJobs(jobs: ProviderJob[]): Promise<Job[]> {
  if (!jobs.length) return [];
  const rows = jobs.map((j) => ({
    external_id: j.external_id ?? fingerprintId(j),
    title: j.title.slice(0, 500),
    company: j.company.slice(0, 300),
    company_logo: j.company_logo ?? null,
    description: j.description ?? "",
    responsibilities: j.responsibilities ?? [],
    required_skills: j.required_skills ?? [],
    preferred_skills: j.preferred_skills ?? [],
    location: j.location ?? null,
    country: j.country ?? null,
    remote_status: j.remote_status ?? null,
    employment_type: j.employment_type ?? null,
    experience_level: j.experience_level ?? null,
    salary_min: j.salary_min ?? null,
    salary_max: j.salary_max ?? null,
    salary_currency: j.salary_currency ?? null,
    salary_period: j.salary_period ?? null,
    application_url: j.application_url,
    source_name: j.source_name,
    source_url: j.source_url ?? null,
    published_at: j.published_at ?? null,
    status: "active",
    raw_source_data: (j.raw ?? {}) as object,
  }));

  // Upsert on the (external_id, source_name) unique constraint, refreshing
  // mutable fields when the same vacancy is rediscovered.
  const results = await prisma.$transaction(
    rows.map((row) =>
      prisma.job.upsert({
        where: {
          external_id_source_name: {
            external_id: row.external_id ?? "",
            source_name: row.source_name,
          },
        },
        create: row,
        update: {
          title: row.title,
          company: row.company,
          company_logo: row.company_logo,
          description: row.description,
          responsibilities: row.responsibilities,
          required_skills: row.required_skills,
          preferred_skills: row.preferred_skills,
          location: row.location,
          country: row.country,
          remote_status: row.remote_status,
          employment_type: row.employment_type,
          experience_level: row.experience_level,
          salary_min: row.salary_min,
          salary_max: row.salary_max,
          salary_currency: row.salary_currency,
          salary_period: row.salary_period,
          application_url: row.application_url,
          source_url: row.source_url,
          published_at: row.published_at,
          status: "active",
          raw_source_data: row.raw_source_data,
          updated_at: new Date(),
        },
      }),
    ),
  );
  return results as unknown as Job[];
}

export async function getJobById(id: string): Promise<Job | null> {
  const job = await prisma.job.findUnique({ where: { id } });
  return (job as unknown as Job) ?? null;
}

/** Blocked hosts for SSRF protection. */
const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254", // AWS metadata
  "metadata.google.internal",
]);

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Block private IP ranges and localhost
    if (BLOCKED_HOSTS.has(hostname)) return false;
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) {
      return false;
    }
    if (hostname.startsWith("172.16.") && hostname < "172.32.") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Lightweight liveness check on an application URL (HEAD then GET fallback). */
export async function verifyApplicationUrl(
  url: string,
): Promise<{ ok: boolean; status: number | null; finalUrl: string }> {
  // SSRF protection: only allow safe external URLs
  if (!isSafeUrl(url)) {
    return { ok: false, status: null, finalUrl: url };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
    }
    clearTimeout(timer);
    return { ok: res.ok, status: res.status, finalUrl: res.url };
  } catch {
    return { ok: false, status: null, finalUrl: url };
  }
}
