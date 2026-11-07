import type { Prisma } from "@/generated/prisma/client";
import { handleApiError, jsonError, jsonOk, rateLimit } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getJobById, verifyApplicationUrl } from "@/lib/jobs/store";
import { getCurrentUser } from "@/lib/auth-helpers";

/** Verify a job's application link and update verification metadata. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`verify:${user.id}`, 30, 60_000))
      return jsonError("Rate limit exceeded", 429);

    const { id } = await params;
    const job = await getJobById(id);
    if (!job) return jsonError("Job not found", 404);

    const result = await verifyApplicationUrl(job.application_url);
    const now = new Date().toISOString();
    // Only mark expired/closed when the source confirms (HTTP 404/410); network failures → keep status, flag suspicious only on repeated failures is handled elsewhere
    const confirmedGone = result.status === 404 || result.status === 410;
    const update: Prisma.JobUpdateInput = {
      last_verified_at: new Date(now),
      status: confirmedGone
        ? "expired"
        : job.status === "expired"
          ? "active"
          : job.status,
    };

    await prisma.job.update({ where: { id }, data: update });

    return jsonOk({
      job_id: id,
      reachable: result.ok,
      http_status: result.status,
      confirmed_closed: confirmedGone,
      last_verified_at: now,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
