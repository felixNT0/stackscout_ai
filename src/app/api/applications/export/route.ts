import { handleApiError, jsonError, parseBody, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const exportSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
});

/**
 * Export applications to CSV.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`export:${user.id}`, 10, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const { ids } = await parseBody(req, exportSchema);

    const applications = await prisma.application.findMany({
      where: {
        user_id: user.id,
        ...(ids?.length ? { id: { in: ids } } : {}),
      },
      include: {
        job: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Generate CSV
    const headers = [
      "Application ID",
      "Job Title",
      "Company",
      "Location",
      "Status",
      "Applied Date",
      "Interview Date",
      "Salary Expected",
      "Application URL",
      "Source",
      "Notes",
      "Created At",
    ];

    const rows = applications.map((app) => [
      app.id,
      app.job?.title ?? "",
      app.job?.company ?? "",
      app.job?.location ?? "",
      app.status,
      app.application_date?.toISOString() ?? "",
      app.interview_date?.toISOString() ?? "",
      app.salary_expected ?? "",
      app.application_url ?? "",
      app.job?.source_name ?? "",
      app.notes ?? "",
      app.created_at.toISOString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="applications-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
