import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/db";
import { connection, NextRequest } from "next/server";
import { z } from "zod";

const createApplicationSchema = z.object({
  job_id: z.string().uuid(),
  status: z
    .enum([
      "interested",
      "applied",
      "phone_screen",
      "interview",
      "offer",
      "rejected",
      "withdrawn",
    ])
    .default("applied"),
  notes: z.string().max(5000).optional(),
  application_url: z.string().url().optional(),
  salary_expected: z.number().int().positive().optional(),
});

/** GET /api/v1/applications — List the API key owner's applications. */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const auth = await authenticateApiKey(req, "read");
    if (!auth) return jsonError("Invalid or expired API key", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
    );

    const applications = await prisma.application.findMany({
      where: {
        user_id: auth.id,
        ...(status && { status }),
      },
      orderBy: { updated_at: "desc" },
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            source_name: true,
          },
        },
      },
    });

    return jsonOk({ applications });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/v1/applications — Create an application (requires `write` scope). */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const auth = await authenticateApiKey(req, "write");
    if (!auth) return jsonError("Invalid or expired API key or insufficient scope", 401);

    const body = await parseBody(req, createApplicationSchema);

    // Verify the job exists
    const job = await prisma.job.findUnique({
      where: { id: body.job_id },
      select: { id: true, status: true },
    });
    if (!job || job.status !== "active") {
      return jsonError("Job not found or no longer active", 404);
    }

    // One application per user+job — update if exists, else create
    const data = {
      status: body.status,
      notes: body.notes,
      application_url: body.application_url,
      salary_expected: body.salary_expected,
    };
    const existing = await prisma.application.findFirst({
      where: { user_id: auth.id, job_id: body.job_id },
    });
    const application = existing
      ? await prisma.application.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.application.create({
          data: {
            user_id: auth.id,
            job_id: body.job_id,
            ...data,
            application_date: new Date(),
          },
        });

    return jsonOk({ application }, { status: existing ? 200 : 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
