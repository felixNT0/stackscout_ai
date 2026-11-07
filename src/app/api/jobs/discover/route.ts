import { fallbackQueries, generateSearchQueries } from "@/lib/ai/job-analysis";
import { isAiConfigured } from "@/lib/ai/openai";
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
import { discoverRequestSchema } from "@/lib/validations";
import { applyFilters, discoverJobs, sortJobs } from "@/services/job-discovery";
import { NextRequest } from "next/server";

/** AI-powered personalized discovery: generate queries from the candidate profile, then search. */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`discover:${user.id}`, 10, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const input = await parseBody(req, discoverRequestSchema);

    // Load candidate profile + skills
    const profile = await prisma.candidateProfile.findFirst({
      where: { user_id: user.id },
      select: {
        id: true,
        full_name: true,
        professional_headline: true,
        total_years_experience: true,
        location: true,
      },
    });
    const skills = profile
      ? await prisma.candidateSkill.findMany({
          where: { candidate_profile_id: profile.id },
          select: { skill_name: true },
        })
      : [];
    const exps = profile
      ? await prisma.workExperience.findMany({
          where: { candidate_profile_id: profile.id },
          select: { job_title: true, company: true },
          take: 10,
        })
      : [];

    let queries = input.queries;
    let generated: { query: string; rationale: string }[] = [];
    if (!queries?.length) {
      const skillNames = (skills ?? []).map(
        (s: { skill_name: string }) => s.skill_name,
      );
      if (isAiConfigured() && skillNames.length) {
        try {
          generated = await generateSearchQueries({
            headline: profile?.professional_headline,
            skills: skillNames,
            experiences: exps ?? [],
            years: profile?.total_years_experience,
          });
        } catch {
          generated = fallbackQueries(
            skillNames,
            (exps ?? []).map((e: { job_title: string }) => e.job_title),
          );
        }
      } else {
        generated = fallbackQueries(
          skillNames,
          (exps ?? []).map((e: { job_title: string }) => e.job_title),
        );
      }
      queries = generated.map((g) => g.query).slice(0, 6);
    }
    if (!queries?.length) {
      return jsonError(
        "No search queries available. Upload a resume or provide queries.",
        400,
      );
    }

    // Fan out across providers for each query (bounded)
    const perQuery = Math.max(
      5,
      Math.floor(input.max_results_per_query / queries.length),
    );
    const outcomes = await Promise.all(
      queries.slice(0, 6).map((q) =>
        discoverJobs({
          query: q,
          filters: input.filters,
          pageSize: perQuery,
        }),
      ),
    );

    const allJobs = outcomes.flatMap((o) => o.jobs);
    const providerResults = outcomes.flatMap((o) => o.providerResults);
    const filtered = applyFilters(allJobs, input.filters);
    const sorted = sortJobs(filtered, "relevance");
    const pageSlice = sorted.slice(0, input.max_results_per_query);
    const persisted = await persistJobs(pageSlice).catch(
      () => [] as Awaited<ReturnType<typeof persistJobs>>,
    );

    // Fallback: if DB persistence failed, map ProviderJob → Job shape with generated id
    const jobs =
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

    return jsonOk({
      jobs,
      total: sorted.length,
      queries: queries.slice(0, 6),
      generated_queries: generated,
      providers: providerResults.map((r) => ({
        name: r.provider,
        count: r.jobs.length,
        error: r.error ?? null,
        mocked: r.mocked ?? false,
      })),
      used_mock: outcomes.every((o) => o.usedMock),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
