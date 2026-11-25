import type { ApplyChannel } from "./channels";
import type { ApplicationPackage, SubmissionResult } from "./greenhouse";

/**
 * Lever application submission.
 * Uses the Lever postings API endpoint.
 *
 * Lever accepts POST requests to:
 * https://api.lever.co/v0/postings/{company}/{posting_id}/apply
 *
 * Or the hosted apply URL:
 * https://jobs.lever.co/{company}/{posting_id}/apply
 */
export async function submitLever(
  channel: Extract<ApplyChannel, { type: "lever" }>,
  pkg: ApplicationPackage,
): Promise<SubmissionResult> {
  const { company, postingId } = channel;

  const form = new FormData();
  form.append("name", `${pkg.firstName} ${pkg.lastName}`);
  form.append("email", pkg.email);
  if (pkg.phone) form.append("phone", pkg.phone);

  // Resume file
  if (pkg.resumeBuffer && pkg.resumeFileName) {
    const blob = new Blob([new Uint8Array(pkg.resumeBuffer)], {
      type: pkg.resumeContentType ?? "application/pdf",
    });
    form.append("resume", blob, pkg.resumeFileName);
  }

  // Cover letter / additional info
  if (pkg.coverLetterText) {
    form.append("comments", pkg.coverLetterText);
  }

  // LinkedIn
  if (pkg.linkedinUrl) {
    form.append("urls[LinkedIn]", pkg.linkedinUrl);
  }
  if (pkg.websiteUrl) {
    form.append("urls[Portfolio]", pkg.websiteUrl);
  }

  // Custom answers — Lever uses question IDs or custom field names
  if (pkg.answers) {
    for (const [key, value] of Object.entries(pkg.answers)) {
      // Lever custom questions use the question text as key
      // or specific field names like "question_123"
      form.append(key, value);
    }
  }

  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(postingId)}/apply`;

  try {
    const res = await fetch(url, {
      method: "POST",
      body: form,
      headers: {
        "User-Agent": "StackScout-AI/1.0 (application bot)",
        Accept: "application/json",
      },
      redirect: "follow",
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        status: res.status,
        message: "Application submitted successfully",
        submissionId: data.id ?? data.application_id ?? undefined,
      };
    }

    const errorBody = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: `Lever rejected application: ${errorBody.slice(0, 300) || res.statusText}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: `Network error: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}
