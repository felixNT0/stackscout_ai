import { handleApiError, jsonError, jsonOk, parseBody, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { discoverJobs } from "@/services/job-discovery";
import { NextRequest } from "next/server";
import { z } from "zod";

const similaritySchema = z.object({
  job_id: z.string().uuid(),
  limit: z.number().min(1).max(20).default(10),
});

/**
 * Find similar jobs based on a given job's title, company, skills, and location.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`job-similarity:${user.id}`, 20, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const { job_id, limit } = await parseBody(req, similaritySchema);

    // Load the source job
    const job = await prisma.job.findFirst({
      where: { id: job_id },
    });

    if (!job) return jsonError("Job not found", 404);

    // Build search query from job title + key skills
    const skills = job.required_skills ?? [];
    const query = [job.title, ...skills.slice(0, 3)].join(" ");

    // Search for similar jobs
    const { jobs: similarJobs, usedMock } = await discoverJobs({
      query,
      filters: {
        job_title: job.title,
        location: job.location ?? undefined,
        remote_status: job.remote_status ? [job.remote_status] : undefined,
        employment_type: job.employment_type ? [job.employment_type] : undefined,
      },
      pageSize: limit * 2, // Get more to filter out the source job
    });

    // Filter out the source job and dedupe
    const filtered = similarJobs
      .filter((j) => j.external_id !== job.external_id)
      .slice(0, limit)
      .map((j) => ({
        id: j.external_id,
        title: j.title,
        company: j.company,
        location: j.location,
        description: j.description?.slice(0, 500),
        application_url: j.application_url,
        source_name: j.source_name,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        salary_currency: j.salary_currency,
        salary_period: j.salary_period,
        published_at: j.published_at,
        remote_status: j.remote_status,
        employment_type: j.employment_type,
      }));

    return jsonOk({
      source_job: {
        id: job.id,
        title: job.title,
        company: job.company,
      },
      similar_jobs: filtered,
      used_mock: usedMock,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
