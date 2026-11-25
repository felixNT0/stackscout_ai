import { handleApiError, jsonError, jsonOk, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { generateResumePdf } from "@/lib/resume/pdf";
import { downloadFile } from "@/lib/storage";
import type { ApplicationPackage } from "@/services/apply";
import { detectApplyChannel, submitApplication } from "@/services/apply";
import { NextRequest } from "next/server";

/**
 * Submit a prepared application.
 * Downloads resume, builds package, submits via detected channel.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`apply-submit:${user.id}`, 5, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const { id } = await params;

    // Load application with job and payload
    const app = await prisma.application.findFirst({
      where: { id, user_id: user.id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            application_url: true,
            source_name: true,
          },
        },
      },
    });

    if (!app) return jsonError("Application not found", 404);

    // Check submission status
    if (app.submission_status === "submitted") {
      return jsonError("Application already submitted", 409);
    }
    if (app.submission_status === "submitting") {
      return jsonError("Application submission already in progress", 409);
    }

    const payload = app.submission_payload as Record<string, unknown> | null;
    if (!payload) {
      return jsonError("No submission package found. Prepare the application first.", 400);
    }

    // Mark as submitting
    await prisma.application.update({
      where: { id },
      data: { submission_status: "submitting" },
    });

    try {
      // Build application package
      const pkg: ApplicationPackage = {
        firstName: (payload.candidate as Record<string, string>)?.full_name?.split(" ")[0] ?? "",
        lastName: (payload.candidate as Record<string, string>)?.full_name?.split(" ").slice(1).join(" ") ?? "",
        email: (payload.candidate as Record<string, string>)?.email ?? "",
        phone: (payload.candidate as Record<string, string>)?.phone ?? undefined,
        linkedinUrl: (payload.candidate as Record<string, string>)?.linkedin_url ?? undefined,
        websiteUrl: (payload.candidate as Record<string, string>)?.portfolio_url ?? undefined,
        coverLetterText: payload.cover_letter as string | undefined,
      };

      // Add custom question answers
      const questionAnswers = payload.question_answers as { question: string; answer: string; field_type?: string }[] | undefined;
      if (questionAnswers?.length) {
        pkg.answers = {};
        for (const qa of questionAnswers) {
          // Use question text as key — Greenhouse/Lever will map to field IDs
          pkg.answers[qa.question] = qa.answer;
        }
      }

      // Use tailored resume text if available, otherwise original resume file
      const tailoredResume = payload.tailored_resume as string | undefined;
      const resume = payload.resume as Record<string, string> | null;
      const candidateName = (payload.candidate as Record<string, string>)?.full_name;

      if (tailoredResume) {
        // Generate ATS-optimized PDF from tailored resume text
        try {
          const pdfBuffer = await generateResumePdf(tailoredResume, candidateName);
          pkg.resumeBuffer = pdfBuffer;
          pkg.resumeFileName = `resume-${app.job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
          pkg.resumeContentType = "application/pdf";
        } catch {
          // PDF generation failed — fall back to text
          const resumeBuffer = Buffer.from(tailoredResume, "utf-8");
          pkg.resumeBuffer = resumeBuffer;
          pkg.resumeFileName = `resume-${app.job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
          pkg.resumeContentType = "text/plain";
        }
      } else if (resume?.file_path) {
        // Fall back to original resume file
        try {
          const resumeBuffer = await downloadFile(resume.file_path);
          pkg.resumeBuffer = resumeBuffer;
          pkg.resumeFileName = resume.file_name;
          pkg.resumeContentType = resume.file_type;
        } catch {
          // Resume download failed — continue without it
        }
      }

      // Detect channel
      const channel = detectApplyChannel(
        app.job.application_url ?? "",
        app.job.source_name,
      );

      // Submit
      const result = await submitApplication(channel, pkg, {
        jobTitle: app.job.title,
        company: app.job.company,
        recruiterEmail: app.recruiter_email ?? undefined,
      });

      // Update application
      const newStatus = result.ok ? "applied" : "preparing";
      const submissionStatus = result.ok ? "submitted" : "failed";

      await prisma.application.update({
        where: { id },
        data: {
          status: newStatus,
          submission_status: submissionStatus,
          submission_channel: channel.type,
          submitted_at: result.ok ? new Date() : null,
          application_date: result.ok ? new Date() : null,
        },
      });

      // Log event
      await prisma.applicationEvent.create({
        data: {
          application_id: id,
          event_type: result.ok ? "submitted" : "submission_failed",
          event_date: new Date().toISOString().slice(0, 10),
          notes: result.message,
        },
      });

      return jsonOk({
        success: result.ok,
        message: result.message,
        channel: channel.type,
        submission_status: submissionStatus,
      });
    } catch (err) {
      // Reset status on error
      await prisma.application.update({
        where: { id },
        data: { submission_status: "failed" },
      });

      await prisma.applicationEvent.create({
        data: {
          application_id: id,
          event_type: "submission_error",
          event_date: new Date().toISOString().slice(0, 10),
          notes: err instanceof Error ? err.message : "Unknown error",
        },
      });

      return jsonError(
        `Submission failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        500,
      );
    }
  } catch (err) {
    return handleApiError(err);
  }
}
