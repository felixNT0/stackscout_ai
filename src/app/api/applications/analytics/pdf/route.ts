import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { generateAnalyticsPdf } from "@/lib/reports/analytics-pdf";
import { connection, NextResponse } from "next/server";

/**
 * Export application analytics as PDF.
 */
export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get analytics data (same as /api/applications/analytics)
    const [
      totalApps,
      byStatus,
      recentApps,
      submittedApps,
      interviews,
      offers,
      rejections,
    ] = await Promise.all([
      prisma.application.count({ where: { user_id: user.id } }),
      prisma.application.groupBy({
        by: ["status"],
        where: { user_id: user.id },
        _count: { status: true },
      }),
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
      prisma.application.count({
        where: { user_id: user.id, submission_status: "submitted" },
      }),
      prisma.application.count({
        where: {
          user_id: user.id,
          status: { in: ["interview", "technical_interview", "final_interview"] },
        },
      }),
      prisma.application.count({
        where: { user_id: user.id, status: "offer" },
      }),
      prisma.application.count({
        where: { user_id: user.id, status: "rejected" },
      }),
    ]);

    const closedApps = rejections + offers;
    const responseRate = closedApps > 0 ? ((offers / closedApps) * 100).toFixed(1) : "0";

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

    const statusMap = new Map(byStatus.map((s) => [s.status, s._count.status]));

    const analyticsData = {
      overview: {
        total_applications: totalApps,
        submitted: submittedApps,
        interviews,
        offers,
        rejections,
        response_rate: parseFloat(responseRate),
        avg_response_time_days: avgResponseTime ? parseFloat(avgResponseTime) : null,
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
      recent_activity: {
        last_30_days: recentApps.length,
        submitted_last_30_days: recentApps.filter((a) => a.submitted_at).length,
      },
    };

    const pdfBuffer = await generateAnalyticsPdf(analyticsData, user.name ?? undefined);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="application-analytics-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Analytics PDF export failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
