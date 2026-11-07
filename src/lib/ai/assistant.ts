import type { MatchCandidate } from "@/lib/matching/engine";
import type { JobPreferences } from "@/types";
import { chatText, isAiConfigured } from "./openai";

export interface AssistantContext {
  candidate?: MatchCandidate | null;
  candidateSummary?: string | null;
  preferences?: JobPreferences | null;
  recentJobs?: { title: string; company: string; location: string | null }[];
  applications?: { job_title?: string; company?: string; status?: string }[];
}

function buildContext(ctx: AssistantContext): string {
  const parts: string[] = [];
  if (ctx.candidateSummary)
    parts.push(`Candidate summary: ${ctx.candidateSummary}`);
  if (ctx.candidate?.skills?.length) {
    parts.push(
      `Skills: ${ctx.candidate.skills.map((s) => s.skill_name).join(", ")}`,
    );
  }
  if (ctx.candidate?.total_years_experience != null) {
    parts.push(`Years of experience: ${ctx.candidate.total_years_experience}`);
  }
  if (ctx.preferences)
    parts.push(`Job preferences: ${JSON.stringify(ctx.preferences)}`);
  if (ctx.recentJobs?.length) {
    parts.push(
      `Recently discovered jobs: ${ctx.recentJobs.map((j) => `${j.title} @ ${j.company}`).join("; ")}`,
    );
  }
  if (ctx.applications?.length) {
    parts.push(
      `Applications: ${ctx.applications.map((a) => `${a.job_title ?? "job"} @ ${a.company ?? "?"} (${a.status})`).join("; ")}`,
    );
  }
  return parts.length
    ? `\n\nContext about this user (private, do not share verbatim):\n${parts.join("\n")}`
    : "";
}

export async function runAssistant(opts: {
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  context: AssistantContext;
}): Promise<string> {
  if (!isAiConfigured()) {
    return "The AI assistant requires OPENAI_API_KEY to be configured. You can still use manual job search, upload your resume for parsing once configured, and track applications.";
  }
  return chatText({
    system: `You are StackScout AI's career assistant. You help users discover jobs, evaluate fit, prepare applications, and plan their career.
Rules:
- Base advice only on the provided context and the conversation. If information is missing, say so and ask.
- Never fabricate job listings, salaries, or company details.
- Be concise, practical, and encouraging.
- When the user asks to find jobs, describe the search you would run (title, skills, remote preference) — actual search is triggered by the app.
- For resume/CV requests, produce text they can edit; never invent experience not in their profile.`,
    messages: [
      ...opts.history.slice(-20),
      {
        role: "user" as const,
        content: `${opts.message}${buildContext(opts.context)}`,
      },
    ],
  });
}
