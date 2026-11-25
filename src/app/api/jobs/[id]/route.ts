import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { fingerprintId } from "@/lib/jobs/dedupe";
import { getJobById } from "@/lib/jobs/store";
import type { Job } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const job = await getJobById(id);
    if (!job) return jsonError("Job not found", 404);

    // Record the view (fire-and-forget, don't block response)
    const j = job as Job;
    const fp = fingerprintId({
      title: j.title,
      company: j.company,
      location: j.location,
      application_url: j.application_url,
    });
    prisma.jobView
      .upsert({
        where: { user_id_job_id: { user_id: user.id, job_id: id } },
        create: { user_id: user.id, job_id: id, fingerprint: fp },
        update: { viewed_at: new Date(), fingerprint: fp },
      })
      .catch(() => {});

    return jsonOk({ job });
  } catch (err) {
    return handleApiError(err);
  }
}
