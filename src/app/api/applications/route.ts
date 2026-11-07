import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { applicationCreateSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const rows = await prisma.application.findMany({
      where: {
        user_id: user.id,
        ...(status ? { status } : {}),
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            remote_status: true,
            employment_type: true,
            application_url: true,
            source_name: true,
          },
        },
        events: { orderBy: { event_date: "asc" } },
      },
      orderBy: { updated_at: "desc" },
    });

    // PostgREST returned the joined job under `jobs`; keep that response shape.
    const applications = rows.map(({ job, ...rest }) => ({
      ...rest,
      jobs: job,
    }));
    return jsonOk({ applications });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const input = await parseBody(req, applicationCreateSchema);

    // Verify job exists
    const job = await prisma.job.findFirst({
      where: { id: input.job_id },
      select: { id: true, application_url: true },
    });
    if (!job) return jsonError("Job not found", 404);

    const data = await prisma.application.create({
      data: {
        user_id: user.id,
        job_id: input.job_id,
        status: input.status,
        application_date: input.application_date || null,
        company_contact: input.company_contact || null,
        recruiter_name: input.recruiter_name || null,
        recruiter_email: input.recruiter_email || null,
        interview_date: input.interview_date || null,
        notes: input.notes || null,
        salary_expected: input.salary_expected ?? null,
        application_url: input.application_url || job.application_url || null,
      },
    });

    await prisma.applicationEvent.create({
      data: {
        application_id: data.id,
        event_type: "created",
        event_date: new Date().toISOString().slice(0, 10),
        notes: `Application created with status "${input.status}"`,
      },
    });

    return jsonOk({ application: data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
