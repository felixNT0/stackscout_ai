import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { connection } from "next/server";

/**
 * Get application analytics for the current user.
 * Returns pipeline stats, response rates, and insights.
 */
export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const [
      totalApps,
      byStatus,
      recentApps,
      submittedApps,
      interviews,
      offers,
      rejections,
      timeToHireData,
    ] = await Promise.all([
      // Total applications
      prisma.application.count({ where: { user_id: user.id } }),
      // Count by status
      prisma.application.groupBy({
        by: ["status"],
        where: { user_id: user.id },
        _count: { status: true },
      }),
      // Recent applications (last 30 days)
      prisma.application.findMany({
        where: {
          user_id: user.id,
          created_at: { gte: new Date(Date.now() - 30 * 86400000) },
        },
        select: {
          status: true,
          created_at: true,
          application_date: true,
          submitted_at: true,
        },
      }),
      // Submitted applications
      prisma.application.count({
        where: { user_id: user.id, submission_status: "submitted" },
      }),
      // Interviews
      prisma.application.count({
        where: {
          user_id: user.id,
          status: { in: ["interview", "technical_interview", "final_interview"] },
        },
      }),
      // Offers
      prisma.application.count({
        where: { user_id: user.id, status: "offer" },
      }),
      // Rejections
      prisma.application.count({
        where: { user_id: user.id, status: "rejected" },
      }),
      // Time-to-hire data (days from applied to offer)
      prisma.application.findMany({
        where: {
          user_id: user.id,
          status: "offer",
          application_date: { not: null },
        },
        select: {
          application_date: true,
          updated_at: true,
        },
      }),
    ]);

    // Calculate response rate
    const closedApps = rejections + offers;
    const responseRate = closedApps > 0 ? ((offers / closedApps) * 100).toFixed(1) : 0;

    // Calculate average time to response (days)
    const appsWithResponse = recentApps.filter(
      (a) => a.submitted_at && ["interview", "offer", "rejected"].includes(a.status),
    );
    const avgResponseTime =
      appsWithResponse.length > 0
        ? (
            appsWithResponse.reduce((sum, a) => {
              const submitted = a.submitted_at ? new Date(a.submitted_at) : new Date(a.created_at);
              const updated = new Date(a.created_at);
              return sum + (updated.getTime() - submitted.getTime()) / 86400000;
            }, 0) / appsWithResponse.length
          ).toFixed(1)
        : null;

    // Status breakdown
    const statusMap = new Map(byStatus.map((s) => [s.status, s._count.status]));

    // Calculate time-to-hire (days from applied to offer)
    const timeToHireDays = timeToHireData
      .map((app) => {
        const applied = app.application_date ? new Date(app.application_date) : null;
        const updated = new Date(app.updated_at);
        return applied ? (updated.getTime() - applied.getTime()) / 86400000 : null;
      })
      .filter((d): d is number => d !== null && d > 0);

    const avgTimeToHire = timeToHireDays.length > 0
      ? Math.round(timeToHireDays.reduce((a, b) => a + b, 0) / timeToHireDays.length)
      : null;

    // Application funnel (conversion rates)
    const funnel = {
      saved: statusMap.get("saved") ?? 0,
      applied: statusMap.get("applied") ?? 0,
      interview: (statusMap.get("interview") ?? 0) + (statusMap.get("technical_interview") ?? 0) + (statusMap.get("final_interview") ?? 0),
      offer: statusMap.get("offer") ?? 0,
      rejected: statusMap.get("rejected") ?? 0,
      withdrawn: statusMap.get("withdrawn") ?? 0,
    };

    const funnelRates = {
      saved_to_applied: funnel.saved > 0 ? ((funnel.applied / funnel.saved) * 100).toFixed(1) : "0",
      applied_to_interview: funnel.applied > 0 ? ((funnel.interview / funnel.applied) * 100).toFixed(1) : "0",
      interview_to_offer: funnel.interview > 0 ? ((funnel.offer / funnel.interview) * 100).toFixed(1) : "0",
      overall_success: funnel.applied > 0 ? ((funnel.offer / funnel.applied) * 100).toFixed(1) : "0",
    };

    return jsonOk({
      overview: {
        total_applications: totalApps,
        submitted: submittedApps,
        interviews,
        offers,
        rejections,
        response_rate: parseFloat(responseRate as string),
        avg_response_time_days: avgResponseTime ? parseFloat(avgResponseTime) : null,
        avg_time_to_hire_days: avgTimeToHire,
      },
      pipeline: {
        interested: statusMap.get("interested") ?? 0,
        saved: statusMap.get("saved") ?? 0,
        preparing: statusMap.get("preparing") ?? 0,
        applied: statusMap.get("applied") ?? 0,
        assessment: statusMap.get("assessment") ?? 0,
        interview: statusMap.get("interview") ?? 0,
        technical_interview: statusMap.get("technical_interview") ?? 0,
        final_interview: statusMap.get("final_interview") ?? 0,
        offer: statusMap.get("offer") ?? 0,
        rejected: statusMap.get("rejected") ?? 0,
        withdrawn: statusMap.get("withdrawn") ?? 0,
      },
      funnel: {
        ...funnel,
        rates: funnelRates,
      },
      recent_activity: {
        last_30_days: recentApps.length,
        submitted_last_30_days: recentApps.filter((a) => a.submitted_at).length,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
