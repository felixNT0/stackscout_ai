import type { Prisma } from "@/generated/prisma/client";
import { chatJson, isAiConfigured } from "@/lib/ai/openai";
import {
  handleApiError,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
} from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { fingerprintId } from "@/lib/jobs/dedupe";
import { persistJobs } from "@/lib/jobs/store";
import { jobSearchRequestSchema } from "@/lib/validations";
import { applyFilters, discoverJobs, sortJobs } from "@/services/job-discovery";
import type { JobSearchFilters } from "@/types";
import { NextRequest } from "next/server";

const NL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["query", "filters"],
  properties: {
    query: { type: "string" },
    filters: {
      type: "object",
      additionalProperties: false,
      required: [
        "job_title",
        "keywords",
        "technology",
        "skill",
        "company",
        "industry",
        "location",
        "country",
        "employment_type",
        "remote_status",
        "experience_level",
        "salary_min",
        "salary_max",
        "salary_currency",
        "date_posted",
        "visa_sponsorship",
        "worldwide_remote",
        "relocation_assistance",
        "equity_opportunities",
        "no_degree_requirement",
        "english_speaking",
        "easy_application",
      ],
      properties: {
        job_title: { type: "string" },
        keywords: { type: "string" },
        technology: { type: "string" },
        skill: { type: "string" },
        company: { type: "string" },
        industry: { type: "string" },
        location: { type: "string" },
        country: { type: "string" },
        employment_type: { type: "array", items: { type: "string" } },
        remote_status: { type: "array", items: { type: "string" } },
        experience_level: { type: "array", items: { type: "string" } },
        salary_min: { anyOf: [{ type: "number" }, { type: "null" }] },
        salary_max: { anyOf: [{ type: "number" }, { type: "null" }] },
        salary_currency: { type: "string" },
        date_posted: { type: "string" },
        visa_sponsorship: { type: "boolean" },
        worldwide_remote: { type: "boolean" },
        relocation_assistance: { type: "boolean" },
        equity_opportunities: { type: "boolean" },
        no_degree_requirement: { type: "boolean" },
        english_speaking: { type: "boolean" },
        easy_application: { type: "boolean" },
      },
    },
  },
} as const;

/** Translate a natural-language job search into structured params. */
async function parseNaturalLanguage(
  text: string,
): Promise<{ query: string; filters: JobSearchFilters }> {
  if (!isAiConfigured()) {
    // Deterministic fallback: treat whole text as query
    return { query: text, filters: {} };
  }
  try {
    const result = await chatJson<{ query: string; filters: JobSearchFilters }>(
      {
        schemaName: "job_search_params",
        schema: NL_SCHEMA as unknown as Record<string, unknown>,
        system: `Convert a natural-language job search request into structured parameters.
- query: the core job title/keywords phrase (e.g. "React Developer")
- filters: extract location, remote/hybrid/onsite, employment type, experience level, salary (annual), country, visa sponsorship, etc.
- remote_status values: "remote" | "hybrid" | "on-site". employment_type: full-time|part-time|contract|freelance|internship|temporary.
- experience_level: internship|entry|junior|mid|senior|lead|principal|director.
- Leave fields empty when not mentioned. "at least $80,000 annually" → salary_min: 80000, salary_currency: "USD", and note annual in query if needed.`,
        user: text,
      },
    );
    return result;
  } catch {
    return { query: text, filters: {} };
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`search:${user.id}`, 20, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const input = await parseBody(req, jobSearchRequestSchema);

    let query = input.query;
    let filters = (input.filters ?? {}) as JobSearchFilters;

    if (input.natural_language) {
      const parsed = await parseNaturalLanguage(input.query);
      query = parsed.query;
      filters = { ...filters, ...parsed.filters };
    }

    const { jobs, providerResults, usedMock } = await discoverJobs({
      query,
      filters,
      page: input.page,
      pageSize: input.page_size,
    });

    const filtered = applyFilters(jobs, filters);
    const sorted = sortJobs(filtered, input.sort);
    const pageSlice = sorted.slice(
      (input.page - 1) * input.page_size,
      input.page * input.page_size,
    );

    const persisted = await persistJobs(pageSlice).catch(
      () => [] as Awaited<ReturnType<typeof persistJobs>>,
    );

    // Fallback: if DB persistence failed, map ProviderJob → Job shape with generated id
    const resultJobs =
      persisted.length > 0
        ? persisted
        : pageSlice.map((j) => ({
            ...j,
            id: j.external_id ?? fingerprintId(j),
            external_id: j.external_id ?? null,
            company_logo: j.company_logo ?? null,
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
            source_url: j.source_url ?? null,
            published_at: j.published_at ?? null,
            discovered_at: new Date().toISOString(),
            last_verified_at: null,
            expiration_date: null,
            status: "active" as const,
            raw_source_data: j.raw ?? {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

    // Record the search
    await prisma.jobSearch.create({
      data: {
        user_id: user.id,
        query,
        filters: filters as unknown as Prisma.InputJsonValue,
        results_count: sorted.length,
        saved: input.save_search,
      },
    });

    return jsonOk({
      jobs: resultJobs,
      total: sorted.length,
      page: input.page,
      page_size: input.page_size,
      providers: providerResults.map((r) => ({
        name: r.provider,
        count: r.jobs.length,
        error: r.error ?? null,
        mocked: r.mocked ?? false,
      })),
      used_mock: usedMock,
      resolved_query: query,
      resolved_filters: filters,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
