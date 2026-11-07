import { chatText, isAiConfigured } from "./openai";
import type { MatchCandidate } from "@/lib/matching/engine";
import type { JobAnalysis } from "./job-analysis";

function candidateBlock(c: MatchCandidate | null | undefined): string {
  if (!c) return "No candidate profile available.";
  return [
    c.skills.map((s) => `- ${s.skill_name} (${s.proficiency}${s.is_professional ? ", professional" : ""})`).join("\n"),
    `Total years of experience: ${c.total_years_experience ?? "unknown"}`,
    c.experiences.map((e) => `- ${e.job_title} at ${e.company}: ${(e.responsibilities ?? []).slice(0, 5).join("; ")}`).join("\n"),
  ].join("\n");
}

function jobBlock(title: string, analysis: JobAnalysis | null, description?: string): string {
  if (!analysis) return `Job: ${title}\n${(description ?? "").slice(0, 4000)}`;
  return [
    `Job title: ${title}`,
    `Required skills: ${analysis.required_skills.join(", ") || "unknown"}`,
    `Preferred skills: ${analysis.preferred_skills.join(", ") || "none listed"}`,
    `Responsibilities: ${analysis.responsibilities.join("; ") || "not listed"}`,
    `Level: ${analysis.experience_level}; Type: ${analysis.employment_type}; Remote: ${analysis.remote_status}`,
    `Salary: ${analysis.salary_min ?? "?"}-${analysis.salary_max ?? "?"} ${analysis.salary_currency} ${analysis.salary_period}`,
  ].join("\n");
}

export async function generateCoverLetter(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
  tone?: string;
  instructions?: string;
}): Promise<string> {
  if (!isAiConfigured()) {
    return "Cover letter generation requires OPENAI_API_KEY. Template: state the role, 2-3 relevant skills from your profile, one achievement, and a call to action.";
  }
  return chatText({
    system: `Write a tailored cover letter. Rules:
- Use ONLY facts present in the candidate profile — never invent employers, achievements, or skills.
- 250-400 words, professional tone, no placeholders like [Your Name] — use the candidate's real details if present, otherwise leave a clearly marked bracket.
- Address the specific job requirements where the candidate genuinely matches.`,
    messages: [{
      role: "user",
      content: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}\nTone: ${opts.tone ?? "professional"}\nExtra instructions: ${opts.instructions ?? "none"}`,
    }],
  });
}

export async function tailorResume(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
  instructions?: string;
}): Promise<string> {
  if (!isAiConfigured()) {
    return "Resume tailoring requires OPENAI_API_KEY.";
  }
  return chatText({
    system: `Rewrite the candidate's resume to target this job. Rules:
- Reorder and rephrase ONLY using facts in the profile — never fabricate experience, metrics, or skills.
- Emphasize skills matching the job's required/preferred skills.
- Keep it ATS-friendly: clear sections (Summary, Skills, Experience, Education, Projects), standard headings, no tables or graphics.
- Output plain text/markdown the user can edit.`,
    messages: [{
      role: "user",
      content: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}\nInstructions: ${opts.instructions ?? "none"}`,
    }],
  });
}

export async function generateProfessionalSummary(candidate: MatchCandidate | null): Promise<string> {
  if (!isAiConfigured()) return "Professional summary generation requires OPENAI_API_KEY.";
  return chatText({
    system: "Write a 2-3 sentence professional summary for a resume using only facts in the profile.",
    messages: [{ role: "user", content: candidateBlock(candidate) }],
  });
}

export async function analyzeMatchForUser(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
  score: number;
}): Promise<string> {
  if (!isAiConfigured()) {
    return `Match score: ${opts.score}%. AI explanations require OPENAI_API_KEY.`;
  }
  return chatText({
    system: `Explain this job-candidate match for the user. Cover: why it matches, where they're strong, missing requirements, concerns, interview prep suggestions, likely interview questions, and skills to improve. Be honest — do not inflate.`,
    messages: [{
      role: "user",
      content: `Score: ${opts.score}%\nCandidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}`,
    }],
  });
}
