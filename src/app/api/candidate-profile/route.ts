import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { candidateProfileUpdateSchema } from "@/lib/validations";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const profile = await prisma.candidateProfile.findFirst({
      where: { user_id: user.id },
    });
    if (!profile) return jsonOk({ profile: null });

    const [skills, experiences, education, projects] = await Promise.all([
      prisma.candidateSkill.findMany({
        where: { candidate_profile_id: profile.id },
        orderBy: { skill_name: "asc" },
      }),
      prisma.workExperience.findMany({
        where: { candidate_profile_id: profile.id },
        orderBy: { start_date: "desc" },
      }),
      prisma.education.findMany({
        where: { candidate_profile_id: profile.id },
      }),
      prisma.candidateProject.findMany({
        where: { candidate_profile_id: profile.id },
      }),
    ]);

    return jsonOk({
      profile: { ...profile, embedding: undefined },
      skills,
      experiences,
      education,
      projects,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const input = await parseBody(req, candidateProfileUpdateSchema);

    const existing = await prisma.candidateProfile.findFirst({
      where: { user_id: user.id },
      select: { id: true },
    });
    if (!existing)
      return jsonError(
        "No candidate profile yet — upload and analyze a resume first",
        404,
      );

    const data = await prisma.candidateProfile.update({
      where: { id: existing.id },
      data: { ...input, updated_at: new Date() },
    });
    return jsonOk({ profile: { ...data, embedding: undefined } });
  } catch (err) {
    return handleApiError(err);
  }
}
