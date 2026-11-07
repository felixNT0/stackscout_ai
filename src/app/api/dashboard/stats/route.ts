import {handleApiError, jsonOk, jsonError} from "@/lib/api";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";

async function requireAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { user_id: userId },
    select: { role: true },
  });
  return profile?.role === "admin" || profile?.role === "super_admin";
}

export { requireAdmin };

/** Aggregated stats for the current user's dashboard. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const uid = user.id;
    const today = new Date().toISOString().slice(0, 10);

    const [
      jobsDiscovered,
      strongMatches,
      saved,
      applications,
      interviews,
      searches,
      alerts,
      unread,
      topMatches,
      recentApps,
      pipelineRows,
    ] = await Promise.all([
      prisma.jobSearch.count({ where: { user_id: uid } }),
      prisma.jobMatch.count({
        where: { user_id: uid, compatibility_score: { gte: 70 } },
      }),
      prisma.savedJob.count({ where: { user_id: uid } }),
      prisma.application.count({ where: { user_id: uid } }),
      prisma.application.count({
        where: {
          user_id: uid,
          interview_date: { gte: new Date(today) },
        },
      }),
      prisma.jobSearch.count({ where: { user_id: uid } }),
      prisma.searchAlert.count({ where: { user_id: uid, is_active: true } }),
      prisma.notification.count({ where: { user_id: uid, read: false } }),
      prisma.jobMatch.findMany({
        where: { user_id: uid },
        select: {
          compatibility_score: true,
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
              salary_min: true,
              salary_max: true,
              salary_currency: true,
            },
          },
        },
        orderBy: { compatibility_score: "desc" },
        take: 5,
      }),
      prisma.application.findMany({
        where: { user_id: uid },
        select: {
          id: true,
          status: true,
          updated_at: true,
          job: { select: { title: true, company: true } },
        },
        orderBy: { updated_at: "desc" },
        take: 5,
      }),
      prisma.application.findMany({
        where: { user_id: uid },
        select: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const a of pipelineRows)
      statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;

    // Preserve the original PostgREST response shape (`jobs(...)` -> `jobs` key)
    const topMatchesOut = topMatches.map((m) => ({
      compatibility_score: m.compatibility_score,
      jobs: m.job,
    }));
    const recentAppsOut = recentApps.map((a) => ({
      id: a.id,
      status: a.status,
      updated_at: a.updated_at,
      jobs: a.job,
    }));

    return jsonOk({
      stats: {
        jobs_discovered: jobsDiscovered,
        strong_matches: strongMatches,
        saved_jobs: saved,
        applications: applications,
        upcoming_interviews: interviews,
        searches,
        active_alerts: alerts,
        unread_notifications: unread,
      },
      top_matches: topMatchesOut,
      recent_applications: recentAppsOut,
      pipeline: statusCounts,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
