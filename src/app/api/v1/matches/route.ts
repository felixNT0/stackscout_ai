import { connection, NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/db";

/** GET /api/v1/matches — Job matches for the API key owner. */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const auth = await authenticateApiKey(req, "read");
    if (!auth) return jsonError("Invalid or expired API key", 401);

    const { searchParams } = new URL(req.url);
    const minScore = parseInt(searchParams.get("min_score") ?? "0", 10);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
    );

    const matches = await prisma.jobMatch.findMany({
      where: { user_id: auth.id, compatibility_score: { gte: minScore } },
      orderBy: { compatibility_score: "desc" },
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            remote_status: true,
            employment_type: true,
            salary_min: true,
            salary_max: true,
            salary_currency: true,
            source_name: true,
            application_url: true,
            published_at: true,
          },
        },
      },
    });

    return jsonOk({ matches });
  } catch (err) {
    return handleApiError(err);
  }
}
