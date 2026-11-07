import { chatJson } from "./openai";
import { extractSkillsFromText } from "@/lib/matching/engine";

export interface GeneratedQuery {
  query: string;
  rationale: string;
}

const QUERIES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["queries"],
  properties: {
    queries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["query", "rationale"],
        properties: {
          query: { type: "string" },
          rationale: { type: "string" },
        },
      },
    },
  },
} as const;

/** Generate diverse job search queries from a candidate profile. */
export async function generateSearchQueries(input: {
  headline?: string | null;
  skills: string[];
  experiences: { job_title: string; company: string }[];
  years?: number | null;
}): Promise<GeneratedQuery[]> {
  const skills = input.skills.slice(0, 30).join(", ");
  const titles = input.experiences.map((e) => e.job_title).slice(0, 8).join(", ");
  const result = await chatJson<{ queries: GeneratedQuery[] }>({
    schemaName: "search_queries",
    schema: QUERIES_SCHEMA as unknown as Record<string, unknown>,
    system: `You generate job search queries for a job-discovery platform. Produce 6-10 queries that:
- Cover the candidate's top skills and adjacent roles (e.g. React → "React Developer", "Frontend Engineer", "Next.js Developer")
- Vary seniority (entry, mid, senior), work arrangement (remote, hybrid), employment type (full-time, contract)
- Include alternative job titles describing similar responsibilities
- Each query should be a short keyword phrase suitable for a job board search (3-7 words)
- rationale: one sentence explaining why the query fits this candidate`,
    user: `Headline: ${input.headline ?? "unknown"}\nSkills: ${skills}\nExperience titles: ${titles}\nYears of experience: ${input.years ?? "unknown"}`,
  });
  return result.queries.slice(0, 10);
}

/** Fallback queries without AI — derived directly from skills. */
export function fallbackQueries(skills: string[], titles: string[] = []): GeneratedQuery[] {
  const top = skills.slice(0, 6);
  const qs: GeneratedQuery[] = [];
  for (const s of top) {
    qs.push({ query: `${s} Developer`, rationale: `Direct match for skill: ${s}` });
    qs.push({ query: `Remote ${s} Engineer`, rationale: `Remote variant for ${s}` });
  }
  for (const t of titles.slice(0, 3)) {
    qs.push({ query: t, rationale: `Matches experience title: ${t}` });
  }
  return qs.slice(0, 10);
}

/** Extract structured requirements from a job description (cached by caller). */
const JOB_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["required_skills", "preferred_skills", "responsibilities", "experience_level", "employment_type", "salary_min", "salary_max", "salary_currency", "salary_period", "remote_status", "visa_sponsorship", "benefits"],
  properties: {
    required_skills: { type: "array", items: { type: "string" } },
    preferred_skills: { type: "array", items: { type: "string" } },
    responsibilities: { type: "array", items: { type: "string" } },
    experience_level: { type: "string", enum: ["internship", "entry", "junior", "mid", "senior", "lead", "principal", "director", "unknown"] },
    employment_type: { type: "string", enum: ["full-time", "part-time", "contract", "freelance", "internship", "temporary", "unknown"] },
    salary_min: { anyOf: [{ type: "number" }, { type: "null" }] },
    salary_max: { anyOf: [{ type: "number" }, { type: "null" }] },
    salary_currency: { type: "string" },
    salary_period: { type: "string", enum: ["hourly", "monthly", "annual", "unknown"] },
    remote_status: { type: "string", enum: ["remote", "hybrid", "on-site", "unknown"] },
    visa_sponsorship: { type: "boolean" },
    benefits: { type: "array", items: { type: "string" } },
  },
} as const;

export interface JobAnalysis {
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  experience_level: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: string;
    remote_status: string;
  visa_sponsorship: boolean;
  benefits: string[];
}

export async function analyzeJobDescription(title: string, description: string): Promise<JobAnalysis> {
  const keywordSkills = extractSkillsFromText(`${title} ${description}`);
  try {
    const result = await chatJson<JobAnalysis>({
      schemaName: "job_analysis",
      schema: JOB_ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
      system: `Extract structured fields from a job posting. Rules:
- Only extract facts stated or strongly implied in the text. Use "unknown"/null/empty when absent — never invent salary, location, or requirements.
- required_skills: must-have technologies/skills. preferred_skills: nice-to-haves.
- experience_level: infer from seniority terms (junior, mid, senior, lead, principal, intern, entry-level).
- salary_*: only if explicitly stated; normalize period to hourly/monthly/annual.`,
      user: `Job title: ${title}\n\nDescription:\n${description.slice(0, 12000)}`,
    });
    // Merge keyword-extracted skills the model may have missed
    const merged = new Set([...result.required_skills.map((s) => s.toLowerCase()), ...keywordSkills]);
    result.required_skills = [...merged];
    return result;
  } catch {
    // Graceful degradation: keyword extraction only
    return {
      required_skills: keywordSkills,
      preferred_skills: [],
      responsibilities: [],
      experience_level: "unknown",
      employment_type: "unknown",
      salary_min: null,
      salary_max: null,
      salary_currency: "",
      salary_period: "unknown",
      remote_status: /remote/i.test(title) ? "remote" : "unknown",
      visa_sponsorship: false,
      benefits: [],
    };
  }
}
