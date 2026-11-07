import type { CandidateSkill, JobPreferences, WorkExperience } from "@/types";

export interface MatchCandidate {
  skills: Pick<CandidateSkill, "skill_name" | "is_professional" | "proficiency" | "years_experience">[];
  experiences: Pick<WorkExperience, "job_title" | "company" | "responsibilities" | "achievements">[];
  total_years_experience: number | null;
  location?: string | null;
}

export interface MatchJob {
  title: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  experience_level: string | null;
  location: string | null;
  country: string | null;
  remote_status: string | null;
  employment_type: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
}

export interface MatchResult {
  compatibility_score: number;
  technical_stack_score: number;
  experience_score: number;
  responsibilities_score: number;
  seniority_score: number;
  location_score: number;
  industry_score: number;
  matching_skills: string[];
  missing_skills: string[];
  relevant_experience: string;
  potential_weaknesses: string[];
  seniority_compatibility: string;
  location_eligibility: string;
  explanation: string;
  recommendation: string;
  category: "excellent" | "strong" | "good" | "partial" | "low";
}

const WEIGHTS = {
  technical: 0.35,
  experience: 0.25,
  responsibilities: 0.15,
  seniority: 0.1,
  location: 0.1,
  industry: 0.05,
} as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
const tokens = (s: string) => new Set(norm(s).split(/\s+/).filter((t) => t.length > 2));

function overlapScore(have: Set<string>, need: string[]): { score: number; matched: string[]; missing: string[] } {
  if (!need.length) return { score: 50, matched: [], missing: [] }; // unknown → neutral, not a penalty
  const matched: string[] = [];
  const missing: string[] = [];
  for (const n of need) {
    const nn = norm(n);
    const hit = have.has(nn) || [...have].some((h) => h.includes(nn) || nn.includes(h));
    (hit ? matched : missing).push(n);
  }
  return { score: Math.round((matched.length / need.length) * 100), matched, missing };
}

const SENIORITY_YEARS: Record<string, number> = {
  internship: 0, entry: 1, junior: 2, mid: 4, senior: 6, lead: 8, principal: 10, director: 12,
};

export function seniorityLabel(years: number | null): string {
  if (years == null) return "unknown";
  if (years < 1) return "entry";
  if (years < 3) return "junior";
  if (years < 5) return "mid";
  if (years < 8) return "senior";
  if (years < 10) return "lead";
  return "principal";
}

export function matchJobToCandidate(candidate: MatchCandidate, job: MatchJob, preferences?: JobPreferences | null): MatchResult {
  // --- Technical stack (35%) ---
  const skillNames = candidate.skills.map((s) => s.skill_name);
  const profSkills = new Set(candidate.skills.filter((s) => s.is_professional).map((s) => norm(s.skill_name)));
  const allSkills = new Set(skillNames.map(norm));
  const required = job.required_skills.length ? job.required_skills : extractSkillsFromText(job.description);
  const preferred = job.preferred_skills;

  const req = overlapScore(allSkills, required);
  const pref = overlapScore(allSkills, preferred);
  // Professional evidence counts double
  const profReq = overlapScore(profSkills, required);
  const technical = Math.round(req.score * 0.6 + pref.score * 0.15 + profReq.score * 0.25);
  const matching_skills = [...new Set([...req.matched, ...pref.matched])];
  const missing_skills = [...new Set(req.missing)];

  // --- Experience (25%) ---
  const jobTokens = tokens(`${job.title} ${job.description} ${job.responsibilities.join(" ")}`);
  const expTokens = new Set(candidate.experiences.flatMap((e) => [...tokens(e.job_title), ...tokens(e.company), ...e.responsibilities.flatMap((r) => [...tokens(r)])]));
  const expOverlap = [...jobTokens].filter((t) => expTokens.has(t)).length;
  const expScore = jobTokens.size ? Math.min(100, Math.round((expOverlap / Math.min(jobTokens.size, 40)) * 100)) : 50;
  const relevant_experience = candidate.experiences
    .filter((e) => {
      const et = tokens(`${e.job_title} ${e.company} ${e.responsibilities.join(" ")}`);
      return [...jobTokens].some((t) => et.has(t));
    })
    .slice(0, 3)
    .map((e) => `${e.job_title} at ${e.company}`)
    .join("; ") || "No directly matching experience found";

  // --- Responsibilities (15%) ---
  const respNeed = job.responsibilities.length ? job.responsibilities : [job.description.slice(0, 500)];
  const resp = overlapScore(allSkills, respNeed.flatMap((r) => r.split(/[,;]/)).map((s) => s.trim()).filter(Boolean).slice(0, 20));
  const responsibilities_score = resp.score;

  // --- Seniority (10%) ---
  const candLevel = seniorityLabel(candidate.total_years_experience);
  const jobLevel = job.experience_level ?? "mid";
  const levelDiff = Math.abs((SENIORITY_YEARS[candLevel] ?? 4) - (SENIORITY_YEARS[jobLevel] ?? 4));
  const seniority_score = Math.max(0, 100 - levelDiff * 15);
  const seniority_compatibility =
    levelDiff === 0 ? "Aligned" : levelDiff === 1 ? "Close" : levelDiff === 2 ? "Stretched" : "Significant gap";

  // --- Location (10%) ---
  let location_score = 50;
  let location_eligibility = "Unknown — location requirements not specified";
  const remote = job.remote_status === "remote";
  const prefRemote = preferences?.remote_only;
  if (remote) {
    location_score = 90;
    location_eligibility = "Eligible — remote role";
    if (prefRemote === false) location_score = 70;
  } else if (job.location && candidate.location) {
    const jl = norm(job.location);
    const cl = norm(candidate.location);
    const match = jl.includes(cl) || cl.includes(jl.split(",")[0]) || tokens(jl).size && [...tokens(jl)].some((t) => tokens(cl).has(t));
    location_score = match ? 85 : 40;
    location_eligibility = match ? "Likely eligible — location match" : "May require relocation";
  } else if (job.location) {
    location_score = 45;
    location_eligibility = "Location specified but candidate location unknown";
  }
  if (preferences?.preferred_countries?.length && job.country) {
    const ok = preferences.preferred_countries.some((c) => norm(c) === norm(job.country!) || norm(job.country!).includes(norm(c)));
    if (ok) location_score = Math.min(100, location_score + 10);
  }

  // --- Industry (5%) ---
  const industryNeed = tokens(`${job.description.slice(0, 800)}`);
  const industryHave = new Set(candidate.experiences.flatMap((e) => [...tokens(e.company)]));
  const indOverlap = [...industryNeed].filter((t) => industryHave.has(t)).length;
  const industry_score = industryNeed.size ? Math.min(100, Math.round((indOverlap / Math.min(industryNeed.size, 30)) * 100)) : 50;

  const compatibility_score = Math.round(
    technical * WEIGHTS.technical +
    expScore * WEIGHTS.experience +
    responsibilities_score * WEIGHTS.responsibilities +
    seniority_score * WEIGHTS.seniority +
    location_score * WEIGHTS.location +
    industry_score * WEIGHTS.industry,
  );

  const potential_weaknesses: string[] = [];
  if (missing_skills.length) potential_weaknesses.push(`Missing required skills: ${missing_skills.slice(0, 5).join(", ")}`);
  if (seniority_compatibility === "Stretched" || seniority_compatibility === "Significant gap") potential_weaknesses.push(`Seniority ${seniority_compatibility.toLowerCase()} — role targets ${jobLevel} level`);
  if (location_score < 60) potential_weaknesses.push("Location eligibility uncertain");
  if (!job.salary_min && !job.salary_max) potential_weaknesses.push("Salary not disclosed");

  const category =
    compatibility_score >= 90 ? "excellent" :
    compatibility_score >= 80 ? "strong" :
    compatibility_score >= 70 ? "good" :
    compatibility_score >= 50 ? "partial" : "low";

  const recommendation =
    category === "excellent" || category === "strong" ? "Strongly recommended — prioritize this application" :
    category === "good" ? "Worth applying — tailor your resume to address gaps" :
    category === "partial" ? "Consider applying if interested in the domain" :
    "Low compatibility — review carefully before investing time";

  const explanation =
    `Technical stack match ${technical}% (${matching_skills.length} matching skills` +
    `${missing_skills.length ? `, missing: ${missing_skills.slice(0, 4).join(", ")}` : ""}). ` +
    `Experience alignment ${expScore}%. Seniority ${seniority_compatibility.toLowerCase()}. ` +
    `${location_eligibility}. Overall weighted score ${compatibility_score}%.`;

  return {
    compatibility_score,
    technical_stack_score: technical,
    experience_score: expScore,
    responsibilities_score,
    seniority_score,
    location_score,
    industry_score,
    matching_skills,
    missing_skills,
    relevant_experience,
    potential_weaknesses,
    seniority_compatibility,
    location_eligibility,
    explanation,
    recommendation,
    category,
  };
}

/** Cheap keyword-based skill extraction used when a job lacks structured skills. */
const COMMON_SKILLS = [
  "javascript", "typescript", "python", "java", "go", "rust", "c++", "c#", "ruby", "php", "swift", "kotlin",
  "react", "next.js", "vue", "angular", "svelte", "node.js", "node", "express", "nestjs", "django", "flask", "fastapi",
  "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "sqlite", "dynamodb",
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd", "github actions",
  "react native", "flutter", "ios", "android",
  "machine learning", "deep learning", "llm", "openai", "langchain", "pytorch", "tensorflow", "nlp", "computer vision",
  "graphql", "rest api", "microservices", "system design",
  "figma", "ui/ux", "tailwind", "css", "html",
  "git", "agile", "scrum", "jira", "sql", "nosql", "linux", "bash",
];

export function extractSkillsFromText(text: string): string[] {
  const t = text.toLowerCase();
  return COMMON_SKILLS.filter((s) => t.includes(s));
}
