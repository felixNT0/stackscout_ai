import { connection } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";

/**
 * GET /api/share/:token — Public endpoint. Resolves a share token and
 * returns the shared content. No auth required.
 * Increments view_count (fire-and-forget).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  await connection();
  try {
    const { token } = await params;

    const link = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!link || link.revoked_at) {
      return jsonError("Share link not found or revoked", 404);
    }
    if (link.expires_at && link.expires_at < new Date()) {
      return jsonError("Share link has expired", 410);
    }

    // Fire-and-forget view count
    prisma.shareLink
      .update({ where: { id: link.id }, data: { view_count: { increment: 1 } } })
      .catch(() => {});

    const user = await prisma.user.findUnique({
      where: { id: link.user_id },
      select: { name: true, image: true },
    });

    if (link.type === "profile") {
      const [profile, candidate] = await Promise.all([
        prisma.profile.findUnique({
          where: { user_id: link.user_id },
          select: {
            full_name: true,
            professional_headline: true,
            location: true,
            portfolio_url: true,
            github_url: true,
            linkedin_url: true,
          },
        }),
        prisma.candidateProfile.findUnique({
          where: { user_id: link.user_id },
          include: {
            skills: {
              select: {
                skill_name: true,
                proficiency: true,
                years_experience: true,
              },
              take: 20,
            },
            experiences: {
              select: {
                job_title: true,
                company: true,
                start_date: true,
                end_date: true,
                is_current: true,
              },
              orderBy: { start_date: "desc" },
              take: 5,
            },
          },
        }),
      ]);

      // Only expose fields the user chose to make public-ish (no email/phone)
      return jsonOk({
        type: "profile",
        shared_by: user?.name ?? "A StackScout user",
        shared_at: link.created_at,
        profile: profile
          ? {
              full_name: profile.full_name,
              professional_headline: profile.professional_headline,
              location: profile.location,
              portfolio_url: profile.portfolio_url,
              github_url: profile.github_url,
              linkedin_url: profile.linkedin_url,
            }
          : null,
        candidate: candidate
          ? {
              full_name: candidate.full_name,
              professional_headline: candidate.professional_headline,
              summary: candidate.summary,
              total_years_experience: candidate.total_years_experience,
              location: candidate.location,
              skills: candidate.skills,
              experiences: candidate.experiences,
            }
          : null,
      });
    }

    if (link.type === "matches") {
      const matches = await prisma.jobMatch.findMany({
        where: { user_id: link.user_id },
        orderBy: { compatibility_score: "desc" },
        take: 10,
        include: {
          job: {
            select: {
              title: true,
              company: true,
              location: true,
              remote_status: true,
              salary_min: true,
              salary_max: true,
              salary_currency: true,
            },
          },
        },
      });
      return jsonOk({
        type: "matches",
        shared_by: user?.name ?? "A StackScout user",
        matches: matches.map((m) => ({
          compatibility_score: m.compatibility_score,
          job: m.job,
        })),
      });
    }

    if (link.type === "application" && link.target_id) {
      const app = await prisma.application.findFirst({
        where: { id: link.target_id, user_id: link.user_id },
        include: {
          job: {
            select: {
              title: true,
              company: true,
              location: true,
              remote_status: true,
              employment_type: true,
              salary_min: true,
              salary_max: true,
              salary_currency: true,
              source_name: true,
            },
          },
        },
      });
      if (!app) return jsonError("Shared application not found", 404);
      return jsonOk({
        type: "application",
        shared_by: user?.name ?? "A StackScout user",
        application: {
          status: app.status,
          application_date: app.application_date,
          notes: app.notes,
          job: app.job,
        },
      });
    }

    return jsonError("Invalid share link type", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
