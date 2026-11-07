import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { NextRequest } from "next/server";

/** Career insights: aggregate stats computed from the jobs table only. */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { searchParams } = new URL(req.url);
    const days = Math.min(
      365,
      Math.max(1, parseInt(searchParams.get("days") ?? "90", 10)),
    );
    const since = new Date(Date.now() - days * 86400000);

    const list = await prisma.job.findMany({
      where: {
        status: "active",
        discovered_at: { gte: since },
      },
      select: {
        title: true,
        company: true,
        location: true,
        country: true,
        remote_status: true,
        employment_type: true,
        experience_level: true,
        salary_min: true,
        salary_max: true,
        salary_currency: true,
        required_skills: true,
        preferred_skills: true,
        published_at: true,
        discovered_at: true,
        source_name: true,
      },
      take: 5000,
    });

    const countBy = (fn: (j: (typeof list)[number]) => string | null) => {
      const m = new Map<string, number>();
      for (const j of list) {
        const k = fn(j);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    };

    const skillCounts = new Map<string, number>();
    for (const j of list) {
      for (const s of [
        ...(j.required_skills ?? []),
        ...(j.preferred_skills ?? []),
      ]) {
        skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1);
      }
    }

    const salaries = list
      .filter((j) => j.salary_min != null)
      .map((j) => j.salary_min as number);
    const avgSalary = salaries.length
      ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length)
      : null;

    const dayKey = (j: (typeof list)[number]) =>
      (j.published_at ?? j.discovered_at ?? new Date(0))
        .toISOString()
        .slice(0, 10);

    return jsonOk({
      sample_size: list.length,
      period_days: days,
      disclaimer:
        "Insights are computed only from jobs discovered through connected providers in this database — not the entire job market.",
      top_skills: [...skillCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([skill, count]) => ({ skill, count })),
      top_titles: countBy((j) => j.title).map(([title, count]) => ({
        title,
        count,
      })),
      remote_vs_on_site: countBy((j) => j.remote_status ?? "unknown"),
      employment_types: countBy((j) => j.employment_type ?? "unknown"),
      experience_levels: countBy((j) => j.experience_level ?? "unknown"),
      top_countries: countBy((j) => j.country ?? "unknown"),
      top_companies: countBy((j) => j.company).map(([company, count]) => ({
        company,
        count,
      })),
      avg_salary_min: avgSalary,
      salary_currency: "USD",
      jobs_per_day: countBy(dayKey).slice(0, 30),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
