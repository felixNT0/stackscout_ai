import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/db";
import { connection, NextRequest } from "next/server";

/** GET /api/v1/jobs/:id — Job detail including description. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const auth = await authenticateApiKey(req, "read");
    if (!auth) return jsonError("Invalid or expired API key", 401);

    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        remote_status: true,
        employment_type: true,
        experience_level: true,
        salary_min: true,
        salary_max: true,
        salary_currency: true,
        description: true,
        responsibilities: true,
        required_skills: true,
        preferred_skills: true,
        source_name: true,
        source_url: true,
        application_url: true,
        company_logo: true,
        published_at: true,
        expiration_date: true,
        status: true,
        discovered_at: true,
      },
    });

    if (!job || job.status !== "active") {
      return jsonError("Job not found", 404);
    }
    return jsonOk({ job });
  } catch (err) {
    return handleApiError(err);
  }
}
