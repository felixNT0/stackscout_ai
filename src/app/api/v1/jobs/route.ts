import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/db";
import { connection, NextRequest } from "next/server";

/**
 * GET /api/v1/jobs — List jobs (public job board, all active jobs).
 * Auth: Bearer API key with `read` scope.
 * Query: page, page_size, q (search), location, remote, employment_type
 */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const auth = await authenticateApiKey(req, "read");
    if (!auth) return jsonError("Invalid or expired API key", 401);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("page_size") ?? "20", 10)),
    );
    const q = searchParams.get("q")?.trim();
    const location = searchParams.get("location")?.trim();
    const remote = searchParams.get("remote");
    const employmentType = searchParams.get("employment_type");

    const where = {
      status: "active",
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { company: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      }),
      ...(location && {
        location: { contains: location, mode: "insensitive" as const },
      }),
      ...(remote === "true" && { remote_status: "remote" }),
      ...(employmentType && { employment_type: employmentType }),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [{ published_at: "desc" }, { discovered_at: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          company: true,
          company_logo: true,
          location: true,
          remote_status: true,
          employment_type: true,
          experience_level: true,
          salary_min: true,
          salary_max: true,
          salary_currency: true,
          salary_period: true,
          source_name: true,
          application_url: true,
          published_at: true,
          discovered_at: true,
        },
      }),
      prisma.job.count({ where }),
    ]);

    return jsonOk({
      jobs,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
