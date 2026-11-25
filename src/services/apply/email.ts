import { sendEmail } from "@/lib/email";
import type { ApplicationPackage, SubmissionResult } from "./greenhouse";

/**
 * Send a job application via email.
 * Used when the job has a recruiter email or the application URL is a mailto: link.
 */
export async function submitEmail(
  to: string,
  subject: string,
  pkg: ApplicationPackage,
  jobTitle: string,
  company: string,
): Promise<SubmissionResult> {
  const candidateName = `${pkg.firstName} ${pkg.lastName}`.trim();

  // Build HTML email body
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Application: ${jobTitle} at ${company}</h2>
      <p><strong>Candidate:</strong> ${candidateName}</p>
      <p><strong>Email:</strong> ${pkg.email}</p>
      ${pkg.phone ? `<p><strong>Phone:</strong> ${pkg.phone}</p>` : ""}
      ${pkg.linkedinUrl ? `<p><strong>LinkedIn:</strong> <a href="${pkg.linkedinUrl}">${pkg.linkedinUrl}</a></p>` : ""}
      ${pkg.websiteUrl ? `<p><strong>Website:</strong> <a href="${pkg.websiteUrl}">${pkg.websiteUrl}</a></p>` : ""}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <h3>Cover Letter</h3>
      <div style="white-space: pre-wrap;">${pkg.coverLetterText ?? "(No cover letter provided)"}</div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #666; font-size: 14px;">
        This application was sent via StackScout AI on behalf of ${candidateName}.
        Resume is attached as ${pkg.resumeFileName ?? "resume.pdf"}.
      </p>
    </div>
  `;

  // Send email with resume attachment if available
  const attachments = pkg.resumeBuffer
    ? [
        {
          filename: pkg.resumeFileName ?? "resume.pdf",
          content: pkg.resumeBuffer,
          contentType: pkg.resumeContentType ?? "application/pdf",
        },
      ]
    : undefined;

  const sent = await sendEmail({
    to,
    subject: `Application: ${jobTitle} at ${company} — ${candidateName}`,
    html,
    attachments,
  });

  if (sent) {
    return {
      ok: true,
      status: 200,
      message: `Application emailed to ${to}`,
    };
  }

  return {
    ok: false,
    status: 500,
    message: `Failed to send email to ${to}`,
  };
}
