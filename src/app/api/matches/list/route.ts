import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

/** List persisted matches for the user, joined with job data. */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const minScore = parseInt(searchParams.get("min_score") ?? "0", 10);
    const limit = Math.min(
      100,
      parseInt(searchParams.get("limit") ?? "50", 10),
    );

    const rows = await prisma.jobMatch.findMany({
      where: {
        user_id: user.id,
        compatibility_score: { gte: minScore },
      },
      include: { job: true },
      orderBy: { compatibility_score: "desc" },
      take: limit,
    });

    // PostgREST returned the joined job under `jobs`; keep that response shape.
    const matches = rows.map(({ job, ...rest }) => ({ ...rest, jobs: job }));
    return jsonOk({ matches });
  } catch (err) {
    return handleApiError(err);
  }
}
