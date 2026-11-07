import { requireAdmin } from "@/app/api/dashboard/stats/route";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!(await requireAdmin(user.id))) return jsonError("Forbidden", 403);

    const [
      users,
      jobs,
      matches,
      applications,
      resumes,
      searches,
      alerts,
      notifications,
      sources,
      syncLogs,
      statusBreakdown,
      recentSearches,
      failedResumes,
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.job.count(),
      prisma.jobMatch.count(),
      prisma.application.count(),
      prisma.resume.count(),
      prisma.jobSearch.count(),
      prisma.searchAlert.count(),
      prisma.notification.count(),
      prisma.jobSource.findMany(),
      prisma.providerSyncLog.findMany({
        orderBy: { started_at: "desc" },
        take: 20,
      }),
      prisma.job.findMany({ select: { status: true } }),
      prisma.jobSearch.findMany({
        select: {
          id: true,
          query: true,
          results_count: true,
          created_at: true,
          user_id: true,
        },
        orderBy: { created_at: "desc" },
        take: 20,
      }),
      prisma.resume.findMany({
        select: {
          id: true,
          file_name: true,
          status: true,
          error_message: true,
          created_at: true,
        },
        where: { status: "failed" },
        orderBy: { created_at: "desc" },
        take: 20,
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const j of statusBreakdown)
      byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;

    return jsonOk({
      totals: {
        users,
        jobs,
        matches,
        applications,
        resumes,
        searches,
        alerts,
        notifications,
      },
      job_status: byStatus,
      sources,
      sync_logs: syncLogs,
      recent_searches: recentSearches,
      failed_resumes: failedResumes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
