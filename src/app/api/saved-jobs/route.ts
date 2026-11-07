import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { savedJobSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const rows = await prisma.savedJob.findMany({
      where: { user_id: user.id },
      include: { job: true },
      orderBy: { created_at: "desc" },
    });
    // PostgREST returned the joined job under `jobs`; keep that response shape.
    const saved_jobs = rows.map(({ job, ...rest }) => ({ ...rest, jobs: job }));
    return jsonOk({ saved_jobs });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const input = await parseBody(req, savedJobSchema);
    const data = await prisma.savedJob.upsert({
      where: {
        user_id_job_id: { user_id: user.id, job_id: input.job_id },
      },
      create: {
        user_id: user.id,
        job_id: input.job_id,
        notes: input.notes ?? null,
      },
      update: { notes: input.notes ?? null },
    });
    return jsonOk({ saved_job: data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");
    if (!jobId) return jsonError("job_id query param required", 400);
    await prisma.savedJob.deleteMany({
      where: { user_id: user.id, job_id: jobId },
    });
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
