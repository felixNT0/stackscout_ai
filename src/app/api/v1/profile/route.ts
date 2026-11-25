import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/db";
import { connection, NextRequest } from "next/server";

/** GET /api/v1/profile — Candidate profile for the API key owner. */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const auth = await authenticateApiKey(req, "read");
    if (!auth) return jsonError("Invalid or expired API key", 401);

    const candidate = await prisma.candidateProfile.findUnique({
      where: { user_id: auth.id },
      include: {
        skills: {
          select: {
            skill_name: true,
            skill_category: true,
            proficiency: true,
            years_experience: true,
          },
          take: 50,
        },
        experiences: {
          select: {
            job_title: true,
            company: true,
            location: true,
            start_date: true,
            end_date: true,
            is_current: true,
            responsibilities: true,
            achievements: true,
          },
          orderBy: { start_date: "desc" },
          take: 20,
        },
        education: {
          select: {
            institution: true,
            degree: true,
            field_of_study: true,
            start_date: true,
            end_date: true,
          },
          take: 10,
        },
      },
    });

    const profile = await prisma.profile.findUnique({
      where: { user_id: auth.id },
      select: {
        full_name: true,
        professional_headline: true,
        location: true,
        portfolio_url: true,
        github_url: true,
        linkedin_url: true,
        phone: true,
        role: true,
      },
    });

    return jsonOk({
      user: { id: auth.id, email: auth.email, name: auth.name },
      profile,
      candidate,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
