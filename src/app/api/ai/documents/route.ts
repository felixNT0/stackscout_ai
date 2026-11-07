import { loadAssistantContext } from "@/lib/ai/context";
import {
  analyzeMatchForUser,
  generateCoverLetter,
  generateProfessionalSummary,
  tailorResume,
} from "@/lib/ai/documents";
import { analyzeJobDescription } from "@/lib/ai/job-analysis";
import { isAiConfigured } from "@/lib/ai/openai";
import {
  handleApiError,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
} from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { matchJobToCandidate } from "@/lib/matching/engine";
import { coverLetterSchema, tailorResumeSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { z } from "zod";

async function loadJob(jobId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, status: "active" },
  });
}

async function saveDocument(
  userId: string,
  doc: {
    document_type: string;
    job_id?: string | null;
    title: string;
    content: string;
  },
) {
  return prisma.generatedDocument.create({
    data: { user_id: userId, ...doc },
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`ai-docs:${user.id}`, 15, 60_000))
      return jsonError("Rate limit exceeded", 429);
    if (!isAiConfigured())
      return jsonError("AI features require OPENAI_API_KEY", 503);

    const url = new URL(req.url);
    const kind = url.searchParams.get("type");
    const ctx = await loadAssistantContext(user.id);

    if (kind === "cover-letter") {
      const input = await parseBody(req, coverLetterSchema);
      const job = await loadJob(input.job_id);
      if (!job) return jsonError("Job not found", 404);
      const analysis = await analyzeJobDescription(
        job.title,
        job.description ?? "",
      ).catch(() => null);
      const content = await generateCoverLetter({
        candidate: ctx.candidate ?? null,
        jobTitle: job.title,
        company: job.company,
        jobAnalysis: analysis,
        jobDescription: job.description,
        tone: input.tone,
        instructions: input.additional_instructions,
      });
      const doc = await saveDocument(user.id, {
        document_type: "cover_letter",
        job_id: job.id,
        title: `Cover letter — ${job.title} at ${job.company}`,
        content,
      });
      return jsonOk({ document: doc, content });
    }

    if (kind === "tailor-resume") {
      const input = await parseBody(req, tailorResumeSchema);
      const job = await loadJob(input.job_id);
      if (!job) return jsonError("Job not found", 404);
      const analysis = await analyzeJobDescription(
        job.title,
        job.description ?? "",
      ).catch(() => null);
      const content = await tailorResume({
        candidate: ctx.candidate ?? null,
        jobTitle: job.title,
        company: job.company,
        jobAnalysis: analysis,
        jobDescription: job.description,
        instructions: input.additional_instructions,
      });
      const doc = await saveDocument(user.id, {
        document_type: "tailored_resume",
        job_id: job.id,
        title: `Tailored resume — ${job.title} at ${job.company}`,
        content,
      });
      return jsonOk({ document: doc, content });
    }

    if (kind === "summary") {
      const content = await generateProfessionalSummary(ctx.candidate ?? null);
      const doc = await saveDocument(user.id, {
        document_type: "professional_summary",
        title: "Professional summary",
        content,
      });
      return jsonOk({ document: doc, content });
    }

    if (kind === "match-explain") {
      const { job_id } = await parseBody(
        req,
        z.object({
          job_id: z.string().uuid("Invalid job ID"),
        }),
      );
      const job = await loadJob(job_id);
      if (!job) return jsonError("Job not found", 404);
      const analysis = await analyzeJobDescription(
        job.title,
        job.description ?? "",
      ).catch(() => null);
      const candidate = ctx.candidate ?? null;

      // If no candidate profile, check if there's a pending resume
      if (!candidate) {
        const pendingResume = await prisma.resume.findFirst({
          where: { user_id: user.id, status: "pending" },
          orderBy: { created_at: "desc" },
        });
        if (pendingResume) {
          return jsonError(
            "Your resume is uploaded but not yet analyzed. Please go to Dashboard → My Resume and click 'Analyze' to build your candidate profile.",
            400,
          );
        }
        return jsonError(
          "No candidate profile found. Please upload and analyze a resume to enable AI match analysis.",
          400,
        );
      }
      const match = candidate
        ? matchJobToCandidate(
            candidate,
            {
              title: job.title,
              description: job.description ?? "",
              required_skills:
                analysis?.required_skills ?? job.required_skills ?? [],
              preferred_skills:
                analysis?.preferred_skills ?? job.preferred_skills ?? [],
              responsibilities:
                analysis?.responsibilities ?? job.responsibilities ?? [],
              experience_level:
                analysis?.experience_level !== "unknown"
                  ? (analysis?.experience_level ?? null)
                  : job.experience_level,
              location: job.location,
              country: job.country,
              remote_status: job.remote_status,
              employment_type: job.employment_type,
            },
            ctx.preferences,
          )
        : null;
      const content = await analyzeMatchForUser({
        candidate: ctx.candidate ?? null,
        jobTitle: job.title,
        company: job.company,
        jobAnalysis: analysis,
        jobDescription: job.description,
        score: match?.compatibility_score ?? 0,
      });
      const doc = await saveDocument(user.id, {
        document_type: "interview_prep",
        job_id: job.id,
        title: `Match analysis — ${job.title} at ${job.company}`,
        content,
      });
      return jsonOk({
        document: doc,
        content,
        score: match?.compatibility_score ?? null,
      });
    }

    return jsonError("Unknown AI document type", 404);
  } catch (err) {
    return handleApiError(err);
  }
}
