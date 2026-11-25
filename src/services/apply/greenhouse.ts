import type { ApplyChannel } from "./channels";
import { fetchGreenhouseQuestions } from "./questions";

/**
 * Greenhouse application submission.
 * Uses the public job board API endpoint.
 *
 * The Greenhouse job board accepts POST requests to:
 * https://boards.greenhouse.io/{board}/jobs/{job_id}
 *
 * This is a best-effort implementation — Greenhouse may require
 * additional fields (custom questions, EEO data) that we can't know.
 */
export interface ApplicationPackage {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeBuffer?: Buffer;
  resumeFileName?: string;
  resumeContentType?: string;
  coverLetterText?: string;
  coverLetterBuffer?: Buffer;
  coverLetterFileName?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  answers?: Record<string, string>;
}

export interface SubmissionResult {
  ok: boolean;
  status: number;
  message: string;
  submissionId?: string;
}

export async function submitGreenhouse(
  channel: Extract<ApplyChannel, { type: "greenhouse" }>,
  pkg: ApplicationPackage,
): Promise<SubmissionResult> {
  const { board, jobId } = channel;

  // Greenhouse expects multipart/form-data
  const form = new FormData();
  form.append("first_name", pkg.firstName);
  form.append("last_name", pkg.lastName);
  form.append("email", pkg.email);
  if (pkg.phone) form.append("phone", pkg.phone);

  // Resume file (required by most Greenhouse forms)
  if (pkg.resumeBuffer && pkg.resumeFileName) {
    const blob = new Blob([new Uint8Array(pkg.resumeBuffer)], {
      type: pkg.resumeContentType ?? "application/pdf",
    });
    form.append("resume", blob, pkg.resumeFileName);
  }

  // Cover letter — Greenhouse accepts text or file
  if (pkg.coverLetterText) {
    form.append("cover_letter_text", pkg.coverLetterText);
  }
  if (pkg.coverLetterBuffer && pkg.coverLetterFileName) {
    const blob = new Blob([new Uint8Array(pkg.coverLetterBuffer)], {
      type: "application/pdf",
    });
    form.append("cover_letter", blob, pkg.coverLetterFileName);
  }

  if (pkg.linkedinUrl) form.append("question_5087667008", pkg.linkedinUrl);
  if (pkg.websiteUrl) form.append("question_5087670008", pkg.websiteUrl);

  // Custom answers — Greenhouse uses field names like "question_123"
  if (pkg.answers) {
    // Fetch questions to map labels to field names
    const questionsData = await fetchGreenhouseQuestions(board, jobId);
    const questionMap = new Map<string, string>();

    for (const q of questionsData?.questions ?? []) {
      for (const field of q.fields ?? []) {
        questionMap.set(q.label.toLowerCase(), field.name);
        questionMap.set(field.name, field.name);
      }
    }

    for (const [key, value] of Object.entries(pkg.answers)) {
      const fieldName = questionMap.get(key.toLowerCase()) ?? key;
      form.append(fieldName, value);
    }
  }

  const url = `https://boards.greenhouse.io/${encodeURIComponent(board)}/jobs/${encodeURIComponent(jobId)}`;

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

    // Greenhouse returns 422 for validation errors
    const errorBody = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: `Greenhouse rejected application: ${errorBody.slice(0, 300) || res.statusText}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: `Network error: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}
