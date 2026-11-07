import { prisma } from "@/lib/db";
import type { MatchCandidate } from "@/lib/matching/engine";
import type { AssistantContext } from "./assistant";

/** Load the user's candidate profile + preferences + recent activity for AI features. */
export async function loadAssistantContext(
  userId: string,
): Promise<AssistantContext> {
  const profile = await prisma.candidateProfile.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
      professional_headline: true,
      location: true,
      summary: true,
      total_years_experience: true,
    },
  });

  let candidate: MatchCandidate | null = null;
  if (profile) {
    const [skills, experiences] = await Promise.all([
      prisma.candidateSkill.findMany({
        where: { candidate_profile_id: profile.id },
        select: {
          skill_name: true,
          is_professional: true,
          proficiency: true,
          years_experience: true,
        },
      }),
      prisma.workExperience.findMany({
        where: { candidate_profile_id: profile.id },
        select: {
          job_title: true,
          company: true,
          responsibilities: true,
          achievements: true,
        },
      }),
    ]);
    candidate = {
      skills: skills.map((s) => ({
        skill_name: s.skill_name,
        is_professional: s.is_professional,
        proficiency: s.proficiency,
        years_experience: s.years_experience,
      })) as MatchCandidate["skills"],
      experiences: experiences.map((e) => ({
        job_title: e.job_title,
        company: e.company,
        responsibilities: e.responsibilities,
        achievements: e.achievements,
      })),
      total_years_experience: profile.total_years_experience,
      location: profile.location,
    };
  }

  const [prefs, recentJobs, applications] = await Promise.all([
    prisma.jobPreference.findUnique({ where: { user_id: userId } }),
    prisma.job.findMany({
      where: { status: "active" },
      select: { title: true, company: true, location: true },
      orderBy: { discovered_at: "desc" },
      take: 15,
    }),
    prisma.application.findMany({
      where: { user_id: userId },
      select: {
        status: true,
        job: { select: { title: true, company: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 10,
    }),
  ]);

  return {
    candidate,
    candidateSummary: profile?.summary ?? null,
    preferences: prefs as AssistantContext["preferences"],
    recentJobs,
    applications: applications.map((a) => ({
      job_title: a.job?.title,
      company: a.job?.company,
      status: a.status,
    })),
  };
}
