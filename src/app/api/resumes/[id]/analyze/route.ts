import { embed, isAiConfigured } from "@/lib/ai/openai";
import { parseResumeText } from "@/lib/ai/resume-parser";
import { handleApiError, jsonError, jsonOk, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { extractResumeText } from "@/lib/resume/extract";
import { get } from "@vercel/blob";

/** Download resume bytes from Vercel Blob by pathname. */
async function downloadResume(path: string): Promise<Buffer> {
  const result = await get(path, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode !== 200) {
    throw new Error(
      `Could not download resume: ${result?.statusCode ?? "not found"}`,
    );
  }
  const stream = result.stream;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/** Extract text + AI-parse + persist candidate profile. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`resume-analyze:${user.id}`, 5, 60_000))
      return jsonError("Rate limit exceeded", 429);
    if (!isAiConfigured())
      return jsonError("AI parsing requires OPENAI_API_KEY", 503);

    const { id } = await params;

    const resume = await prisma.resume.findFirst({
      where: { id, user_id: user.id },
    });
    if (!resume) return jsonError("Resume not found", 404);

    await prisma.resume.update({
      where: { id },
      data: { status: "processing", error_message: null },
    });

    try {
      const buffer = await downloadResume(resume.file_path);
      const text = await extractResumeText(buffer, resume.file_type);
      if (!text.trim())
        throw new Error("No text could be extracted from this file");

      const parsed = await parseResumeText(text);

      // Upsert candidate profile (one per user)
      const p = parsed.personal;
      const profileFields = {
        user_id: user.id,
        resume_id: id,
        full_name: p.full_name || null,
        professional_headline: p.professional_headline || null,
        email: p.email || null,
        phone: p.phone || null,
        location: p.location || null,
        portfolio_url: p.portfolio_url || null,
        github_url: p.github_url || null,
        linkedin_url: p.linkedin_url || null,
        summary: parsed.summary || null,
        total_years_experience: parsed.total_years_experience || null,
      };
      const profile = await prisma.candidateProfile.upsert({
        where: { user_id: user.id },
        create: profileFields,
        update: profileFields,
      });

      // Replace child collections
      await prisma.candidateSkill.deleteMany({
        where: { candidate_profile_id: profile.id },
      });
      await prisma.workExperience.deleteMany({
        where: { candidate_profile_id: profile.id },
      });
      await prisma.education.deleteMany({
        where: { candidate_profile_id: profile.id },
      });
      await prisma.candidateProject.deleteMany({
        where: { candidate_profile_id: profile.id },
      });

      if (parsed.skills.length) {
        await prisma.candidateSkill.createMany({
          data: parsed.skills.map((s) => ({
            candidate_profile_id: profile.id,
            skill_name: s.name,
            skill_category: s.category,
            proficiency: s.proficiency,
            years_experience: s.years_experience,
            is_professional: s.is_professional,
            evidence: s.evidence || null,
          })),
        });
      }
      if (parsed.experiences.length) {
        await prisma.workExperience.createMany({
          data: parsed.experiences.map((e) => ({
            candidate_profile_id: profile.id,
            job_title: e.job_title,
            company: e.company,
            location: e.location || null,
            start_date: e.start_date || null,
            end_date: e.is_current ? null : e.end_date || null,
            is_current: e.is_current,
            responsibilities: e.responsibilities,
            achievements: e.achievements,
          })),
        });
      }
      if (parsed.education.length) {
        await prisma.education.createMany({
          data: parsed.education.map((e) => ({
            candidate_profile_id: profile.id,
            institution: e.institution,
            degree: e.degree,
            field_of_study: e.field_of_study || null,
            start_date: e.start_date || null,
            end_date: e.end_date || null,
            gpa: e.gpa || null,
          })),
        });
      }
      if (parsed.projects.length) {
        await prisma.candidateProject.createMany({
          data: parsed.projects.map((p) => ({
            candidate_profile_id: profile.id,
            name: p.name,
            description: p.description || null,
            technologies: p.technologies,
            url: p.url || null,
            start_date: p.start_date || null,
            end_date: p.end_date || null,
            is_personal: p.is_personal,
          })),
        });
      }

      // Embedding for semantic matching (best-effort)
      try {
        const emb = await embed([
          `${p.professional_headline} ${parsed.summary} ${parsed.skills.map((s) => s.name).join(" ")}`,
        ]);
        await prisma.$executeRaw`UPDATE candidate_profiles SET embedding = ${JSON.stringify(emb[0])}::vector WHERE id = ${profile.id}`;
      } catch {
        // embedding column may be stored as vector; string cast handled by pgvector — ignore failures
      }

      await prisma.resume.update({
        where: { id },
        data: {
          status: "completed",
          extracted_text: text.slice(0, 50000),
        },
      });

      return jsonOk({ resume_id: id, profile, parsed });
    } catch (err) {
      await prisma.resume.update({
        where: { id },
        data: {
          status: "failed",
          error_message: err instanceof Error ? err.message : "Analysis failed",
        },
      });
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
