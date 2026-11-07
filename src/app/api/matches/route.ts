import { analyzeJobDescription } from "@/lib/ai/job-analysis";
import { isAiConfigured } from "@/lib/ai/openai";
import {
  handleApiError,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  matchJobToCandidate,
  type MatchCandidate,
} from "@/lib/matching/engine";
import type { JobPreferences } from "@/types";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";

const analyzeSchema = z.object({
  job_ids: z.array(z.string().uuid()).max(100).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  ai_enrich: z.boolean().default(false),
});

async function loadCandidate(userId: string) {
  const profile = await prisma.candidateProfile.findFirst({
    where: { user_id: userId },
    select: {
      id: true,
      full_name: true,
      professional_headline: true,
      location: true,
      summary: true,
      total_years_experience: true,
    },
  });
  if (!profile) return null;
  const [skills, experiences] = await Promise.all([
    prisma.candidateSkill.findMany({
      where: { candidate_profile_id: profile.id },
      select: {
        skill_name: true,
        is_professional: true,
        proficiency: true,
        years_experience: true,
      },
    }),
    prisma.workExperience.findMany({
      where: { candidate_profile_id: profile.id },
      select: {
        job_title: true,
        company: true,
        responsibilities: true,
        achievements: true,
      },
    }),
  ]);
  const prefs = await prisma.jobPreference.findFirst({
    where: { user_id: userId },
  });
  return {
    candidate: {
      skills,
      experiences,
      total_years_experience: profile.total_years_experience,
      location: profile.location,
    } as MatchCandidate,
    profileId: profile.id as string,
    // Prisma returns Date objects where the engine's type expects ISO strings.
    preferences: (prefs ?? null) as unknown as JobPreferences | null,
  };
}

/** Run the matching engine over jobs and persist results. */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`matches:${user.id}`, 10, 60_000))
      return jsonError("Rate limit exceeded", 429);

    const input = await parseBody(req, analyzeSchema);
    const loaded = await loadCandidate(user.id);
    if (!loaded)
      return jsonError(
        "No candidate profile. Upload and analyze a resume first.",
        404,
      );

    // Candidate's job pool: explicit ids, else recent active jobs + saved jobs
    let jobs: unknown[];
    if (input.job_ids?.length) {
      jobs = await prisma.job.findMany({
        where: { id: { in: input.job_ids } },
      });
    } else {
      const saved = await prisma.savedJob.findMany({
        where: { user_id: user.id },
        select: { job_id: true },
        take: 50,
      });
      const savedIds = saved.map((s) => s.job_id);
      if (savedIds.length) {
        const [savedJobs, recent] = await Promise.all([
          prisma.job.findMany({
            where: { id: { in: savedIds }, status: "active" },
          }),
          prisma.job.findMany({
            where: { status: "active" },
            orderBy: { discovered_at: "desc" },
            take: input.limit,
          }),
        ]);
        const seen = new Set<string>();
        const merged = [...savedJobs, ...recent].filter((j) =>
          seen.has(j.id) ? false : (seen.add(j.id), true),
        );
        return await scoreAndStore(
          user.id,
          loaded,
          merged.slice(0, input.limit),
          input.ai_enrich,
        );
      }
      jobs = await prisma.job.findMany({
        where: { status: "active" },
        orderBy: { discovered_at: "desc" },
        take: input.limit,
      });
    }
    return await scoreAndStore(user.id, loaded, jobs, input.ai_enrich);
  } catch (err) {
    return handleApiError(err);
  }
}

async function scoreAndStore(
  userId: string,
  loaded: NonNullable<Awaited<ReturnType<typeof loadCandidate>>>,
  jobs: unknown[],
  aiEnrich: boolean,
) {
  const rows = [];
  for (const job of jobs.slice(0, 60)) {
    const j = job as {
      id: string;
      title: string;
      description: string;
      required_skills: string[] | null;
      preferred_skills: string[] | null;
      responsibilities: string[] | null;
      experience_level: string | null;
      location: string | null;
      country: string | null;
      remote_status: string | null;
      employment_type: string | null;
    };
    let required = j.required_skills ?? [];
    if (aiEnrich && isAiConfigured() && required.length === 0) {
      const analysis = await analyzeJobDescription(
        j.title,
        j.description ?? "",
      ).catch(() => null);
      if (analysis) required = analysis.required_skills;
    }
    const result = matchJobToCandidate(
      loaded.candidate,
      {
        title: j.title,
        description: j.description ?? "",
        required_skills: required,
        preferred_skills: j.preferred_skills ?? [],
        responsibilities: j.responsibilities ?? [],
        experience_level: j.experience_level,
        location: j.location,
        country: j.country,
        remote_status: j.remote_status,
        employment_type: j.employment_type,
      },
      loaded.preferences,
    );

    rows.push({
      user_id: userId,
      job_id: j.id,
      candidate_profile_id: loaded.profileId,
      compatibility_score: result.compatibility_score,
      technical_stack_score: result.technical_stack_score,
      experience_score: result.experience_score,
      responsibilities_score: result.responsibilities_score,
      seniority_score: result.seniority_score,
      location_score: result.location_score,
      industry_score: result.industry_score,
      matching_skills: result.matching_skills,
      missing_skills: result.missing_skills,
      relevant_experience: result.relevant_experience,
      potential_weaknesses: result.potential_weaknesses,
      seniority_compatibility: result.seniority_compatibility,
      location_eligibility: result.location_eligibility,
      explanation: result.explanation,
      recommendation: result.recommendation,
    });
  }

  for (const row of rows) {
    await prisma.jobMatch.upsert({
      where: {
        user_id_job_id: { user_id: row.user_id, job_id: row.job_id },
      },
      create: row,
      update: row,
    });
  }
  return jsonOk({
    analyzed: rows.length,
    matches: rows.sort((a, b) => b.compatibility_score - a.compatibility_score),
  });
}
