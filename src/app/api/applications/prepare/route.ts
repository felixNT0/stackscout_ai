import { handleApiError, jsonError, jsonOk, parseBody, rateLimit } from "@/lib/api";
import { resolveProviderKey } from "@/lib/keys/store";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { detectApplyChannel } from "@/services/apply";
import type { GreenhouseQuestion, LeverQuestion } from "@/services/apply/questions";
import { fetchGreenhouseQuestions, fetchLeverQuestions } from "@/services/apply/questions";
import { NextRequest } from "next/server";
import { z } from "zod";

const prepareSchema = z.object({
  job_id: z.string().uuid().optional(),
  job_ids: z.array(z.string().uuid()).max(10).optional(),
  tone: z.enum(["professional", "enthusiastic", "concise"]).default("professional"),
});

interface PrepareResult {
  job_id: string;
  application_id?: string;
  success: boolean;
  error?: string;
  channel?: string;
  has_cover_letter?: boolean;
  has_tailored_resume?: boolean;
  question_count?: number;
}

/**
 * Prepare application packages for one or more jobs.
 * Generates cover letters + ATS-optimized resumes, detects channels.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`apply-prepare:${user.id}`, 10, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const input = await parseBody(req, prepareSchema);

    // Normalize to array of job IDs
    const jobIds = input.job_ids ?? (input.job_id ? [input.job_id] : []);
    if (!jobIds.length) {
      return jsonError("Provide job_id or job_ids", 400);
    }

    // Load candidate profile + resume once
    const profile = await prisma.candidateProfile.findUnique({
      where: { user_id: user.id },
      include: {
        resume: {
          select: {
            id: true,
            file_name: true,
            file_path: true,
            file_type: true,
            file_size: true,
            status: true,
          },
        },
      },
    });

    if (!profile) {
      return jsonError(
        "No candidate profile found. Please upload and analyze a resume first.",
        400,
      );
    }

    // Check AI availability
    const aiConfigured = !!(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);
    let ctx: Awaited<ReturnType<typeof import("@/lib/ai/context").loadAssistantContext>> | null = null;
    if (aiConfigured) {
      try {
        const { loadAssistantContext } = await import("@/lib/ai/context");
        ctx = await loadAssistantContext(user.id);
      } catch {
        ctx = null;
      }
    }

    // Process each job
    const results: PrepareResult[] = [];

    for (const jobId of jobIds.slice(0, 10)) {
      try {
        // Load job
        const job = await prisma.job.findFirst({
          where: { id: jobId, status: "active" },
        });
        if (!job) {
          results.push({ job_id: jobId, success: false, error: "Job not found" });
          continue;
        }

        // Check if application already exists
        const existing = await prisma.application.findFirst({
          where: { user_id: user.id, job_id: jobId },
        });
        if (existing) {
          results.push({
            job_id: jobId,
            success: false,
            error: "Application already exists",
            application_id: existing.id,
          });
          continue;
        }

        // Detect apply channel
        const channel = detectApplyChannel(
          job.application_url ?? "",
          job.source_name,
        );

        // Generate cover letter + ATS-optimized resume via AI
        let coverLetterText: string | null = null;
        let tailoredResumeText: string | null = null;
        let questionAnswers: { question: string; answer: string; required?: boolean; field_type?: string }[] = [];
        if (aiConfigured && ctx) {
          try {
            const { generateCoverLetter, generateAtsOptimizedResume } = await import("@/lib/ai/documents");
            const { analyzeJobDescription } = await import("@/lib/ai/job-analysis");
            const { generateQuestionAnswers } = await import("@/lib/ai/answers");

            const analysis = await analyzeJobDescription(
              job.title,
              job.description ?? "",
            ).catch(() => null);

            // Fetch application questions for Greenhouse/Lever
            let questions: { label: string; required: boolean; type?: string }[] = [];
            if (channel.type === "greenhouse") {
              const ghQuestions = await fetchGreenhouseQuestions(
                (channel as { board: string }).board,
                (channel as { jobId: string }).jobId,
              );
              questions = (ghQuestions?.questions ?? [])
                .filter((q: GreenhouseQuestion) => !q.label.toLowerCase().includes("resume") && !q.label.toLowerCase().includes("cover"))
                .map((q: GreenhouseQuestion) => ({
                  label: q.label,
                  required: q.required,
                  type: q.fields?.[0]?.type,
                }));
            } else if (channel.type === "lever" && resolveProviderKey("lever").apiKey) {
              const leverQuestions = await fetchLeverQuestions(
                (channel as { company: string }).company,
                (channel as { postingId: string }).postingId,
              );
              questions = (leverQuestions ?? [])
                .filter((q: LeverQuestion) => !q.text.toLowerCase().includes("resume") && !q.text.toLowerCase().includes("cover"))
                .map((q: LeverQuestion) => ({
                  label: q.text,
                  required: q.required,
                  type: q.type,
                }));
            }

            const [coverLetter, resume, answers] = await Promise.all([
              generateCoverLetter({
                candidate: ctx.candidate ?? null,
                jobTitle: job.title,
                company: job.company,
                jobAnalysis: analysis,
                jobDescription: job.description,
                tone: input.tone,
              }).catch(() => null),
              generateAtsOptimizedResume({
                candidate: ctx.candidate ?? null,
                jobTitle: job.title,
                company: job.company,
                jobAnalysis: analysis,
                jobDescription: job.description,
              }).catch(() => null),
              questions.length
                ? generateQuestionAnswers({
                    candidate: ctx.candidate ?? null,
                    questions,
                    jobTitle: job.title,
                    company: job.company,
                    jobDescription: job.description,
                  }).catch(() => [])
                : Promise.resolve([]),
            ]);

            coverLetterText = coverLetter;
            tailoredResumeText = resume;
            questionAnswers = answers;
          } catch {
            // AI generation failed — continue without documents
          }
        }

        // Build submission payload
        const submissionPayload = {
          channel: channel.type,
          cover_letter: coverLetterText,
          tailored_resume: tailoredResumeText,
          question_answers: questionAnswers,
          candidate: {
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            linkedin_url: profile.linkedin_url,
            portfolio_url: profile.portfolio_url,
          },
          resume: profile.resume
            ? {
                file_name: profile.resume.file_name,
                file_path: profile.resume.file_path,
                file_type: profile.resume.file_type,
              }
            : null,
          job: {
            title: job.title,
            company: job.company,
            application_url: job.application_url,
          },
        };

        // Create application
        const application = await prisma.application.create({
          data: {
            user_id: user.id,
            job_id: jobId,
            status: "preparing",
            application_url: job.application_url ?? null,
            submission_channel: channel.type,
            submission_status: "pending_review",
            submission_payload: submissionPayload,
          },
        });

        // Log event
        await prisma.applicationEvent.create({
          data: {
            application_id: application.id,
            event_type: "created",
            event_date: new Date().toISOString().slice(0, 10),
            notes: `Auto-apply package prepared (${channel.type})`,
          },
        });

        results.push({
          job_id: jobId,
          application_id: application.id,
          success: true,
          channel: channel.type,
          has_cover_letter: !!coverLetterText,
          has_tailored_resume: !!tailoredResumeText,
          question_count: questionAnswers.length,
        });
      } catch (err) {
        results.push({
          job_id: jobId,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return jsonOk({
      results,
      summary: {
        total: jobIds.length,
        succeeded,
        failed,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
