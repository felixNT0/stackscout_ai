import { chatJson, isAiConfigured } from "@/lib/ai/openai";
import type { MatchCandidate } from "@/lib/matching/engine";

export interface QuestionAnswer {
  question: string;
  answer: string;
  field_name?: string;
  field_type?: string;
  required?: boolean;
}

const ANSWERS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answers"],
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
      },
    },
  },
} as const;

/**
 * Generate AI answers for custom application questions.
 * Uses candidate profile context to provide relevant, truthful answers.
 */
export async function generateQuestionAnswers(opts: {
  candidate: MatchCandidate | null;
  questions: { label: string; required: boolean; type?: string }[];
  jobTitle: string;
  company: string;
  jobDescription?: string;
}): Promise<QuestionAnswer[]> {
  if (!isAiConfigured() || !opts.questions.length) {
    return opts.questions.map((q) => ({
      question: q.label,
      answer: "",
      required: q.required,
    }));
  }

  const candidateContext = opts.candidate
    ? [
        opts.candidate.skills
          .slice(0, 15)
          .map((s) => s.skill_name)
          .join(", "),
        `Experience: ${opts.candidate.total_years_experience ?? "unknown"} years`,
        opts.candidate.experiences
          .slice(0, 5)
          .map((e) => `${e.job_title} at ${e.company}`)
          .join("; "),
      ].join("\n")
    : "No candidate profile available.";

  const questionsText = opts.questions
    .map((q, i) => `${i + 1}. ${q.label}${q.required ? " (required)" : ""}`)
    .join("\n");

  try {
    const result = await chatJson<{ answers: { question: string; answer: string }[] }>({
      schemaName: "question_answers",
      schema: ANSWERS_SCHEMA as unknown as Record<string, unknown>,
      system: `You are helping a job candidate answer application questions. Rules:
- Answer ONLY using facts from the candidate profile — never invent experience, skills, or achievements.
- Be concise but specific. For yes/no questions, answer "Yes" or "No" then briefly explain if yes.
- For text questions, provide 2-4 sentences that highlight relevant experience.
- For dropdown/multiple choice, suggest the best option from the provided choices.
- If the candidate lacks a required qualification, answer honestly but positively (e.g. "I don't have X but I have Y which is transferable").
- Never say "I don't know" — provide the best possible answer based on available information.
- Keep answers professional and ATS-friendly.`,
      user: `Job: ${opts.jobTitle} at ${opts.company}

Candidate Profile:
${candidateContext}

Job Description (excerpt):
${(opts.jobDescription ?? "").slice(0, 3000)}

Questions to answer:
${questionsText}`,
    });

    // Map answers back to original questions
    return opts.questions.map((q, i) => {
      const aiAnswer = result.answers[i]?.answer ?? "";
      return {
        question: q.label,
        answer: aiAnswer,
        required: q.required,
        field_type: q.type,
      };
    });
  } catch {
    // Fallback: return empty answers
    return opts.questions.map((q) => ({
      question: q.label,
      answer: "",
      required: q.required,
    }));
  }
}
