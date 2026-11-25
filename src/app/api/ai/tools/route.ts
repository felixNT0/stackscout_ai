import { loadAssistantContext } from "@/lib/ai/context";
import {
    analyzeSkillGaps,
    evaluateInterviewAnswer,
    generateCoverLetterVariants,
    generateFollowUpEmail,
    generateMockInterview,
    generateSalaryNegotiation,
    getCareerPathAdvice,
    getPortfolioSuggestions,
    predictInterviewQuestions,
    scoreResumeForJob,
} from "@/lib/ai/documents";
import { analyzeJobDescription } from "@/lib/ai/job-analysis";
import { isAiConfigured } from "@/lib/ai/openai";
import { handleApiError, jsonError, jsonOk, parseBody, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum([
    "resume-score",
    "skill-gaps",
    "mock-interview",
    "evaluate-answer",
    "salary-negotiation",
    "predict-questions",
    "cover-letter-variants",
    "follow-up-email",
    "career-path",
    "portfolio-suggestions",
  ]),
  job_id: z.string().uuid().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  context: z.enum(["application", "interview", "offer", "rejection"]).optional(),
  interviewer_name: z.string().optional(),
  days_since_contact: z.number().optional(),
  current_salary: z.number().optional(),
  target_salary: z.number().optional(),
  question_type: z.enum(["technical", "behavioral", "mixed"]).optional(),
  target_roles: z.array(z.string()).optional(),
  existing_projects: z.array(z.string()).optional(),
});

/**
 * AI-powered job seeker tools endpoint.
 * Handles: resume scoring, skill gaps, mock interviews, salary negotiation,
 * question prediction, cover letter variants, follow-up emails, career path,
 * and portfolio suggestions.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`ai-tools:${user.id}`, 20, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    if (!isAiConfigured()) {
      return jsonError("AI features require OPENAI_API_KEY", 400);
    }

    const input = await parseBody(req, actionSchema);
    const ctx = await loadAssistantContext(user.id);

    // Load job if provided
    let job: Awaited<ReturnType<typeof prisma.job.findFirst>> | null = null;
    let analysis: Awaited<ReturnType<typeof analyzeJobDescription>> | null = null;
    if (input.job_id) {
      job = await prisma.job.findFirst({
        where: { id: input.job_id },
      });
      if (job) {
        analysis = await analyzeJobDescription(
          job.title,
          job.description ?? "",
        ).catch(() => null);
      }
    }

    const jobTitle = job?.title ?? "Software Engineer";
    const company = job?.company ?? "Unknown";
    const jobDescription = job?.description;

    switch (input.action) {
      case "resume-score": {
        const result = await scoreResumeForJob({
          candidate: ctx.candidate ?? null,
          jobTitle,
          company,
          jobAnalysis: analysis,
          jobDescription,
        });
        return jsonOk({ result });
      }

      case "skill-gaps": {
        const result = await analyzeSkillGaps({
          candidate: ctx.candidate ?? null,
          jobTitle,
          company,
          jobAnalysis: analysis,
          jobDescription,
        });
        return jsonOk({ result });
      }

      case "mock-interview": {
        const result = await generateMockInterview({
          candidate: ctx.candidate ?? null,
          jobTitle,
          company,
          jobAnalysis: analysis,
          jobDescription,
          questionType: input.question_type,
        });
        return jsonOk({ result });
      }

      case "evaluate-answer": {
        if (!input.question || !input.answer) {
          return jsonError("Question and answer are required", 400);
        }
        const result = await evaluateInterviewAnswer({
          question: input.question,
          answer: input.answer,
          jobTitle,
          company,
          candidate: ctx.candidate ?? null,
        });
        return jsonOk({ result });
      }

      case "salary-negotiation": {
        const result = await generateSalaryNegotiation({
          candidate: ctx.candidate ?? null,
          jobTitle,
          company,
          jobAnalysis: analysis,
          jobDescription,
          currentSalary: input.current_salary,
          targetSalary: input.target_salary,
        });
        return jsonOk({ result });
      }

      case "predict-questions": {
        const result = await predictInterviewQuestions({
          candidate: ctx.candidate ?? null,
          jobTitle,
          company,
          jobAnalysis: analysis,
          jobDescription,
        });
        return jsonOk({ result });
      }

      case "cover-letter-variants": {
        const result = await generateCoverLetterVariants({
          candidate: ctx.candidate ?? null,
          jobTitle,
          company,
          jobAnalysis: analysis,
          jobDescription,
        });
        return jsonOk({ result });
      }

      case "follow-up-email": {
        const result = await generateFollowUpEmail({
          candidate: ctx.candidate ?? null,
          jobTitle,
          company,
          jobAnalysis: analysis,
          jobDescription,
          context: input.context,
          interviewerName: input.interviewer_name,
          daysSinceContact: input.days_since_contact,
        });
        return jsonOk({ result });
      }

      case "career-path": {
        const result = await getCareerPathAdvice({
          candidate: ctx.candidate ?? null,
          currentRole: ctx.candidate?.experiences?.[0]?.job_title,
          yearsExperience: ctx.candidate?.total_years_experience ?? undefined,
          targetIndustry: input.target_roles?.[0],
        });
        return jsonOk({ result });
      }

      case "portfolio-suggestions": {
        const result = await getPortfolioSuggestions({
          candidate: ctx.candidate ?? null,
          targetRoles: input.target_roles ?? [],
          existingProjects: input.existing_projects,
        });
        return jsonOk({ result });
      }

      default:
        return jsonError("Unknown action", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
