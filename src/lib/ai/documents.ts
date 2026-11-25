import type { MatchCandidate } from "@/lib/matching/engine";
import type { JobAnalysis } from "./job-analysis";
import { chatJson, chatText, isAiConfigured } from "./openai";

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
    system: `Write a tailored cover letter optimized for ATS systems and senior recruiters. Rules:
- Use ONLY facts present in the candidate profile — never invent employers, achievements, or skills.
- 300-500 words, professional tone, no placeholders like [Your Name] — use the candidate's real details if present, otherwise leave a clearly marked bracket.
- Address the specific job requirements where the candidate genuinely matches.
- ATS OPTIMIZATION: Include exact keywords from the job title and required skills verbatim (e.g. if job says "React", use "React" not "react.js").
- SENIOR POSITIONING: Emphasize leadership, strategic impact, mentorship, cross-functional collaboration, and measurable business outcomes. Frame experience as "10+ years" or "senior-level" when applicable.
- RECRUITER APPEAL: Lead with a strong hook that shows immediate value. Include one quantified achievement (e.g. "reduced load time by 40%", "led team of 5").
- Structure: Hook → Relevant experience → Key skills match → Achievements → Call to action.
- Avoid generic phrases like "I am writing to express my interest" — be direct and specific.`,
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
    system: `Rewrite the candidate's resume to target this job with ATS optimization and senior-level positioning. Rules:
- Reorder and rephrase ONLY using facts in the profile — never fabricate experience, metrics, or skills.
- Emphasize skills matching the job's required/preferred skills using EXACT keywords from the job description.
- ATS OPTIMIZATION:
  * Use standard section headings: "Professional Summary", "Core Skills", "Professional Experience", "Education", "Projects"
  * Include exact job title keywords in the summary (e.g. "Senior Software Engineer" not "Software Dev")
  * List skills as comma-separated keywords, not paragraphs
  * Use bullet points for achievements, start with action verbs (Led, Developed, Architected, Mentored)
  * Include measurable outcomes when present in profile (%, numbers, team sizes)
  * No tables, columns, headers/footers, images, or special characters that break ATS parsing
- SENIOR POSITIONING:
  * Frame experience as "10+ years" or "senior-level" when applicable
  * Emphasize leadership, mentorship, strategic impact, cross-functional collaboration
  * Highlight scope: team sizes, budget ownership, technical decisions, architecture
  * Include industry-relevant certifications or advanced degrees if present
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

/**
 * Generate an ATS-optimized resume specifically for job applications.
 * This version is more aggressive about keyword matching and senior positioning.
 */
export async function generateAtsOptimizedResume(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
  instructions?: string;
}): Promise<string> {
  if (!isAiConfigured()) {
    return "ATS-optimized resume generation requires OPENAI_API_KEY.";
  }
  return chatText({
    system: `Generate an ATS-optimized resume for this specific job application. This resume will be submitted to Applicant Tracking Systems and reviewed by recruiters looking for senior talent.

CRITICAL RULES:
- Use ONLY facts from the candidate profile — never invent experience, metrics, employers, or skills.
- If candidate has 10+ years experience, explicitly state "10+ years" or "senior-level" in summary.
- Extract and use EXACT keywords from the job description (skills, tools, methodologies, certifications).
- Structure MUST be ATS-parseable:
  * "PROFESSIONAL SUMMARY" — 3-4 sentences with job title keywords + years + key skills
  * "CORE SKILLS" — comma-separated list matching job requirements exactly
  * "PROFESSIONAL EXPERIENCE" — reverse chronological, each role with:
    - Job title, company, dates
    - 3-5 bullet points starting with action verbs
    - Quantified achievements where available
  * "EDUCATION" — degrees, institutions, dates
  * "CERTIFICATIONS" — if any exist in profile
  * "PROJECTS" — relevant projects if any
- NO tables, columns, headers/footers, images, special characters (★, →, •), or graphics.
- Use standard fonts assumed (Arial, Calibri, Times New Roman).
- Keywords must appear naturally, not stuffed. Aim for 5-10% keyword density.
- Senior positioning: emphasize leadership, mentorship, strategic decisions, architecture, cross-functional collaboration.
- If job requires specific certifications (AWS, PMP, etc.), highlight if candidate has them.
- Output plain text that can be converted to PDF/DOCX.`,
    messages: [{
      role: "user",
      content: `TARGET JOB:\nTitle: ${opts.jobTitle}\nCompany: ${opts.company}\n\nJOB ANALYSIS:\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\n\nFULL JOB DESCRIPTION:\n${(opts.jobDescription ?? "").slice(0, 8000)}\n\nCANDIDATE PROFILE:\n${candidateBlock(opts.candidate)}\n\nEXTRA INSTRUCTIONS: ${opts.instructions ?? "none"}`,
    }],
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

/**
 * Generate interview preparation materials for a specific job.
 * Includes likely questions, suggested answers, and talking points.
 */
export async function generateInterviewPrep(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
}): Promise<string> {
  if (!isAiConfigured()) {
    return "Interview prep generation requires OPENAI_API_KEY.";
  }
  return chatText({
    system: `Generate comprehensive interview preparation for this job application. Include:

1. **Company Research** — key facts about the company, recent news, culture
2. **Role Overview** — what the job involves, key responsibilities
3. **Likely Interview Questions** — 10-15 questions categorized:
   - Technical/Role-specific (5-7 questions)
   - Behavioral (3-4 questions)
   - Company/Culture fit (2-3 questions)
4. **Suggested Answers** — for each question, provide a framework or key points the candidate should cover (based ONLY on their actual experience)
5. **STAR Stories** — 3-4 prepared stories from the candidate's experience that can be adapted to common questions
6. **Questions to Ask** — 5-7 smart questions to ask the interviewer
7. **Red Flags** — potential concerns the interviewer might raise and how to address them
8. **Follow-up** — thank you email template and next steps

Use ONLY facts from the candidate profile for answers. Be specific and actionable.`,
    messages: [{
      role: "user",
      content: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}`,
    }],
  });
}

/**
 * Score a candidate's resume/profile against a specific job.
 * Returns a score (0-100) with detailed breakdown.
 */
export async function scoreResumeForJob(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
}): Promise<{
  score: number;
  breakdown: {
    skills_match: number;
    experience_match: number;
    education_match: number;
    keywords_match: number;
    overall_potential: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  missing_keywords: string[];
}> {
  if (!isAiConfigured()) {
    return {
      score: 0,
      breakdown: { skills_match: 0, experience_match: 0, education_match: 0, keywords_match: 0, overall_potential: 0 },
      strengths: [],
      weaknesses: [],
      recommendations: ["Configure OPENAI_API_KEY for AI scoring"],
      missing_keywords: [],
    };
  }

  const prompt = `Score this candidate's resume against the job requirements. Return a JSON object with:

{
  "score": <0-100 overall match score>,
  "breakdown": {
    "skills_match": <0-100 how well candidate's skills match required skills>,
    "experience_match": <0-100 how well experience level matches>,
    "education_match": <0-100 how well education matches requirements>,
    "keywords_match": <0-100 how well resume uses job keywords>,
    "overall_potential": <0-100 how likely candidate is to get hired>
  },
  "strengths": ["<2-4 specific strengths>"],
  "weaknesses": ["<2-4 specific gaps>"],
  "recommendations": ["<3-5 actionable improvements>"],
  "missing_keywords": ["<keywords from job missing in resume>"]
}

Be honest and specific. Do not inflate scores. Consider:
- Exact skill matches vs. related/transferable skills
- Years of experience vs. required level
- Industry/domain relevance
- Keyword optimization for ATS`;

  try {
    const result = await chatJson<{
      score: number;
      breakdown: {
        skills_match: number;
        experience_match: number;
        education_match: number;
        keywords_match: number;
        overall_potential: number;
      };
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      missing_keywords: string[];
    }>({
      schemaName: "resume_score",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["score", "breakdown", "strengths", "weaknesses", "recommendations", "missing_keywords"],
        properties: {
          score: { type: "number" },
          breakdown: {
            type: "object",
            additionalProperties: false,
            required: ["skills_match", "experience_match", "education_match", "keywords_match", "overall_potential"],
            properties: {
              skills_match: { type: "number" },
              experience_match: { type: "number" },
              education_match: { type: "number" },
              keywords_match: { type: "number" },
              overall_potential: { type: "number" },
            },
          },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          missing_keywords: { type: "array", items: { type: "string" } },
        },
      },
      system: prompt,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}`,
    });

    return result;
  } catch {
    return {
      score: 0,
      breakdown: { skills_match: 0, experience_match: 0, education_match: 0, keywords_match: 0, overall_potential: 0 },
      strengths: [],
      weaknesses: [],
      recommendations: ["Scoring failed — try again"],
      missing_keywords: [],
    };
  }
}

/**
 * Analyze skill gaps between candidate and job.
 * Returns missing skills with learning resources.
 */
export async function analyzeSkillGaps(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
}): Promise<{
  missing_skills: { skill: string; importance: "critical" | "important" | "nice_to_have"; reason: string }[];
  partial_matches: { skill: string; current_level: string; required_level: string; gap_description: string }[];
  learning_resources: { skill: string; resources: string[] }[];
  upskilling_plan: string[];
}> {
  if (!isAiConfigured()) {
    return {
      missing_skills: [],
      partial_matches: [],
      learning_resources: [],
      upskilling_plan: ["Configure OPENAI_API_KEY for skill gap analysis"],
    };
  }

  try {
    const result = await chatJson<{
      missing_skills: { skill: string; importance: "critical" | "important" | "nice_to_have"; reason: string }[];
      partial_matches: { skill: string; current_level: string; required_level: string; gap_description: string }[];
      learning_resources: { skill: string; resources: string[] }[];
      upskilling_plan: string[];
    }>({
      schemaName: "skill_gaps",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["missing_skills", "partial_matches", "learning_resources", "upskilling_plan"],
        properties: {
          missing_skills: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["skill", "importance", "reason"],
              properties: {
                skill: { type: "string" },
                importance: { type: "string", enum: ["critical", "important", "nice_to_have"] },
                reason: { type: "string" },
              },
            },
          },
          partial_matches: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["skill", "current_level", "required_level", "gap_description"],
              properties: {
                skill: { type: "string" },
                current_level: { type: "string" },
                required_level: { type: "string" },
                gap_description: { type: "string" },
              },
            },
          },
          learning_resources: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["skill", "resources"],
              properties: {
                skill: { type: "string" },
                resources: { type: "array", items: { type: "string" } },
              },
            },
          },
          upskilling_plan: { type: "array", items: { type: "string" } },
        },
      },
      system: `Analyze the skill gap between this candidate and the job. Return:
- missing_skills: Skills the job requires that candidate lacks completely
- partial_matches: Skills candidate has but at lower proficiency than required
- learning_resources: Free/paid resources to learn each missing skill
- upskilling_plan: 30-60-90 day plan to close gaps

Be specific and actionable. Use real resource names (Coursera, Udemy, freeCodeCamp, etc.)`,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}`,
    });

    return result;
  } catch {
    return {
      missing_skills: [],
      partial_matches: [],
      learning_resources: [],
      upskilling_plan: ["Analysis failed — try again"],
    };
  }
}

/**
 * Generate mock interview questions and evaluate answers.
 */
export async function generateMockInterview(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
  questionType?: "technical" | "behavioral" | "mixed";
}): Promise<{
  questions: { question: string; category: string; difficulty: "easy" | "medium" | "hard"; expected_answer_framework: string }[];
  tips: string[];
}> {
  if (!isAiConfigured()) {
    return {
      questions: [],
      tips: ["Configure OPENAI_API_KEY for mock interviews"],
    };
  }

  try {
    const result = await chatJson<{
      questions: { question: string; category: string; difficulty: "easy" | "medium" | "hard"; expected_answer_framework: string }[];
      tips: string[];
    }>({
      schemaName: "mock_interview",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["questions", "tips"],
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["question", "category", "difficulty", "expected_answer_framework"],
              properties: {
                question: { type: "string" },
                category: { type: "string" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                expected_answer_framework: { type: "string" },
              },
            },
          },
          tips: { type: "array", items: { type: "string" } },
        },
      },
      system: `Generate mock interview questions for this job. Include:
- 5-7 technical/role-specific questions
- 3-4 behavioral questions (STAR format)
- 2-3 company/culture questions
- Expected answer frameworks (not full answers — frameworks the candidate should use)
- Interview tips specific to this role

Questions should be realistic and challenging. Difficulty should vary.`,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}\nQuestion type: ${opts.questionType ?? "mixed"}`,
    });

    return result;
  } catch {
    return {
      questions: [],
      tips: ["Generation failed — try again"],
    };
  }
}

/**
 * Evaluate a mock interview answer.
 */
export async function evaluateInterviewAnswer(opts: {
  question: string;
  answer: string;
  jobTitle: string;
  company: string;
  candidate: MatchCandidate | null;
}): Promise<{
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  better_answer_framework: string;
}> {
  if (!isAiConfigured()) {
    return {
      score: 0,
      feedback: "AI evaluation requires OPENAI_API_KEY",
      strengths: [],
      improvements: [],
      better_answer_framework: "",
    };
  }

  try {
    const result = await chatJson<{
      score: number;
      feedback: string;
      strengths: string[];
      improvements: string[];
      better_answer_framework: string;
    }>({
      schemaName: "interview_evaluation",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["score", "feedback", "strengths", "improvements", "better_answer_framework"],
        properties: {
          score: { type: "number" },
          feedback: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          better_answer_framework: { type: "string" },
        },
      },
      system: `Evaluate this interview answer. Score 0-100 based on:
- Relevance to the question
- Use of STAR method (Situation, Task, Action, Result)
- Specificity and examples
- Alignment with job requirements
- Communication clarity

Provide constructive feedback and a better answer framework. Be honest but encouraging.`,
      user: `Question: ${opts.question}\n\nCandidate's Answer: ${opts.answer}\n\nJob: ${opts.jobTitle} at ${opts.company}\n\nCandidate Profile:\n${candidateBlock(opts.candidate)}`,
    });

    return result;
  } catch {
    return {
      score: 0,
      feedback: "Evaluation failed — try again",
      strengths: [],
      improvements: [],
      better_answer_framework: "",
    };
  }
}

/**
 * Generate salary negotiation script and advice.
 */
export async function generateSalaryNegotiation(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
  currentSalary?: number;
  targetSalary?: number;
}): Promise<{
  market_analysis: string;
  negotiation_script: string;
  talking_points: string[];
  leverage_factors: string[];
  alternatives: string[];
  red_flags: string[];
}> {
  if (!isAiConfigured()) {
    return {
      market_analysis: "AI analysis requires OPENAI_API_KEY",
      negotiation_script: "",
      talking_points: [],
      leverage_factors: [],
      alternatives: [],
      red_flags: [],
    };
  }

  try {
    const result = await chatJson<{
      market_analysis: string;
      negotiation_script: string;
      talking_points: string[];
      leverage_factors: string[];
      alternatives: string[];
      red_flags: string[];
    }>({
      schemaName: "salary_negotiation",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["market_analysis", "negotiation_script", "talking_points", "leverage_factors", "alternatives", "red_flags"],
        properties: {
          market_analysis: { type: "string" },
          negotiation_script: { type: "string" },
          talking_points: { type: "array", items: { type: "string" } },
          leverage_factors: { type: "array", items: { type: "string" } },
          alternatives: { type: "array", items: { type: "string" } },
          red_flags: { type: "array", items: { type: "string" } },
        },
      },
      system: `Generate salary negotiation guidance. Include:
- Market analysis: typical salary range for this role/location/experience
- Negotiation script: word-for-word script for the conversation
- Talking points: key phrases to use
- Leverage factors: what gives candidate bargaining power
- Alternatives: other benefits to negotiate if salary is fixed
- Red flags: signs of bad-faith negotiation or lowball offers

Be realistic and data-driven. Consider location, experience level, and market conditions.`,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}\nCurrent salary: ${opts.currentSalary ?? "not provided"}\nTarget salary: ${opts.targetSalary ?? "not provided"}`,
    });

    return result;
  } catch {
    return {
      market_analysis: "Analysis failed — try again",
      negotiation_script: "",
      talking_points: [],
      leverage_factors: [],
      alternatives: [],
      red_flags: [],
    };
  }
}

/**
 * Predict likely interview questions based on job + candidate.
 */
export async function predictInterviewQuestions(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
}): Promise<{
  technical_questions: string[];
  behavioral_questions: string[];
  company_questions: string[];
  curveball_questions: string[];
  preparation_tips: string[];
}> {
  if (!isAiConfigured()) {
    return {
      technical_questions: [],
      behavioral_questions: [],
      company_questions: [],
      curveball_questions: [],
      preparation_tips: ["Configure OPENAI_API_KEY for question prediction"],
    };
  }

  try {
    const result = await chatJson<{
      technical_questions: string[];
      behavioral_questions: string[];
      company_questions: string[];
      curveball_questions: string[];
      preparation_tips: string[];
    }>({
      schemaName: "interview_questions",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["technical_questions", "behavioral_questions", "company_questions", "curveball_questions", "preparation_tips"],
        properties: {
          technical_questions: { type: "array", items: { type: "string" } },
          behavioral_questions: { type: "array", items: { type: "string" } },
          company_questions: { type: "array", items: { type: "string" } },
          curveball_questions: { type: "array", items: { type: "string" } },
          preparation_tips: { type: "array", items: { type: "string" } },
        },
      },
      system: `Predict the most likely interview questions for this specific job and candidate. Include:
- 5-7 technical/role-specific questions
- 3-4 behavioral questions tailored to candidate's experience
- 2-3 company/culture questions
- 1-2 curveball/unexpected questions
- Preparation tips specific to this role

Questions should be realistic based on the job description and candidate profile.`,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}`,
    });

    return result;
  } catch {
    return {
      technical_questions: [],
      behavioral_questions: [],
      company_questions: [],
      curveball_questions: [],
      preparation_tips: ["Prediction failed — try again"],
    };
  }
}

/**
 * Generate multiple cover letter variants.
 */
export async function generateCoverLetterVariants(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
}): Promise<{
  formal: string;
  enthusiastic: string;
  concise: string;
  creative: string;
}> {
  if (!isAiConfigured()) {
    return {
      formal: "Cover letter generation requires OPENAI_API_KEY",
      enthusiastic: "",
      concise: "",
      creative: "",
    };
  }

  try {
    const result = await chatJson<{
      formal: string;
      enthusiastic: string;
      concise: string;
      creative: string;
    }>({
      schemaName: "cover_letter_variants",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["formal", "enthusiastic", "concise", "creative"],
        properties: {
          formal: { type: "string" },
          enthusiastic: { type: "string" },
          concise: { type: "string" },
          creative: { type: "string" },
        },
      },
      system: `Generate 4 different cover letter variants for this job:
- formal: Traditional, professional, conservative tone (300-400 words)
- enthusiastic: Energetic, passionate, shows excitement (300-400 words)
- concise: Brief, direct, no fluff (150-200 words)
- creative: Unique hook, memorable opening, still professional (300-400 words)

All variants must use ONLY facts from the candidate profile. ATS-optimized with job keywords.`,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}`,
    });

    return result;
  } catch {
    return {
      formal: "Generation failed — try again",
      enthusiastic: "",
      concise: "",
      creative: "",
    };
  }
}

/**
 * Generate follow-up email after application or interview.
 */
export async function generateFollowUpEmail(opts: {
  candidate: MatchCandidate | null;
  jobTitle: string;
  company: string;
  jobAnalysis: JobAnalysis | null;
  jobDescription?: string;
  context?: "application" | "interview" | "offer" | "rejection";
  interviewerName?: string;
  daysSinceContact?: number;
}): Promise<{
  subject: string;
  body: string;
  tone: string;
  tips: string[];
}> {
  if (!isAiConfigured()) {
    return {
      subject: "Follow-up required OPENAI_API_KEY",
      body: "",
      tone: "professional",
      tips: ["Configure OPENAI_API_KEY for email generation"],
    };
  }

  try {
    const result = await chatJson<{
      subject: string;
      body: string;
      tone: string;
      tips: string[];
    }>({
      schemaName: "follow_up_email",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["subject", "body", "tone", "tips"],
        properties: {
          subject: { type: "string" },
          body: { type: "string" },
          tone: { type: "string" },
          tips: { type: "array", items: { type: "string" } },
        },
      },
      system: `Generate a professional follow-up email. Context: ${opts.context ?? "application"}
- If application: polite check-in after ${opts.daysSinceContact ?? 7} days
- If interview: thank you + reiterate interest + key points
- If offer: negotiate or accept gracefully
- If rejection: gracious response, keep door open

Include subject line, body (150-250 words), tone description, and tips.`,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\n${jobBlock(opts.jobTitle, opts.jobAnalysis, opts.jobDescription)}\nCompany: ${opts.company}\nContext: ${opts.context ?? "application"}\nInterviewer: ${opts.interviewerName ?? "not specified"}\nDays since contact: ${opts.daysSinceContact ?? "unknown"}`,
    });

    return result;
  } catch {
    return {
      subject: "Follow-up failed",
      body: "",
      tone: "professional",
      tips: ["Generation failed — try again"],
    };
  }
}

/**
 * Career path advisor — suggest next roles based on skills.
 */
export async function getCareerPathAdvice(opts: {
  candidate: MatchCandidate | null;
  currentRole?: string;
  yearsExperience?: number;
  targetIndustry?: string;
}): Promise<{
  current_trajectory: string;
  recommended_paths: { role: string; description: string; required_skills: string[]; salary_potential: string; difficulty: "easy" | "medium" | "hard" }[];
  skill_priorities: string[];
  timeline: string;
  resources: string[];
}> {
  if (!isAiConfigured()) {
    return {
      current_trajectory: "AI analysis requires OPENAI_API_KEY",
      recommended_paths: [],
      skill_priorities: [],
      timeline: "",
      resources: [],
    };
  }

  try {
    const result = await chatJson<{
      current_trajectory: string;
      recommended_paths: { role: string; description: string; required_skills: string[]; salary_potential: string; difficulty: "easy" | "medium" | "hard" }[];
      skill_priorities: string[];
      timeline: string;
      resources: string[];
    }>({
      schemaName: "career_path",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["current_trajectory", "recommended_paths", "skill_priorities", "timeline", "resources"],
        properties: {
          current_trajectory: { type: "string" },
          recommended_paths: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["role", "description", "required_skills", "salary_potential", "difficulty"],
              properties: {
                role: { type: "string" },
                description: { type: "string" },
                required_skills: { type: "array", items: { type: "string" } },
                salary_potential: { type: "string" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              },
            },
          },
          skill_priorities: { type: "array", items: { type: "string" } },
          timeline: { type: "string" },
          resources: { type: "array", items: { type: "string" } },
        },
      },
      system: `Analyze this candidate's career trajectory and recommend next steps. Include:
- Current trajectory assessment
- 3-5 recommended career paths with descriptions, required skills, salary potential, and difficulty
- Skill priorities to focus on
- Realistic timeline for advancement
- Recommended resources (courses, certifications, books)

Be realistic and data-driven. Consider market demand and candidate's current skills.`,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\nCurrent role: ${opts.currentRole ?? "not specified"}\nYears experience: ${opts.yearsExperience ?? "unknown"}\nTarget industry: ${opts.targetIndustry ?? "not specified"}`,
    });

    return result;
  } catch {
    return {
      current_trajectory: "Analysis failed — try again",
      recommended_paths: [],
      skill_priorities: [],
      timeline: "",
      resources: [],
    };
  }
}

/**
 * Portfolio suggestions based on skills and target roles.
 */
export async function getPortfolioSuggestions(opts: {
  candidate: MatchCandidate | null;
  targetRoles: string[];
  existingProjects?: string[];
}): Promise<{
  project_ideas: { title: string; description: string; skills_demonstrated: string[]; difficulty: "easy" | "medium" | "hard"; time_estimate: string }[];
  portfolio_tips: string[];
  github_suggestions: string[];
  case_study_framework: string;
}> {
  if (!isAiConfigured()) {
    return {
      project_ideas: [],
      portfolio_tips: ["Configure OPENAI_API_KEY for portfolio suggestions"],
      github_suggestions: [],
      case_study_framework: "",
    };
  }

  try {
    const result = await chatJson<{
      project_ideas: { title: string; description: string; skills_demonstrated: string[]; difficulty: "easy" | "medium" | "hard"; time_estimate: string }[];
      portfolio_tips: string[];
      github_suggestions: string[];
      case_study_framework: string;
    }>({
      schemaName: "portfolio_suggestions",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["project_ideas", "portfolio_tips", "github_suggestions", "case_study_framework"],
        properties: {
          project_ideas: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "description", "skills_demonstrated", "difficulty", "time_estimate"],
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                skills_demonstrated: { type: "array", items: { type: "string" } },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                time_estimate: { type: "string" },
              },
            },
          },
          portfolio_tips: { type: "array", items: { type: "string" } },
          github_suggestions: { type: "array", items: { type: "string" } },
          case_study_framework: { type: "string" },
        },
      },
      system: `Suggest portfolio projects and improvements. Include:
- 5-7 project ideas tailored to candidate's skills and target roles
- Portfolio presentation tips
- GitHub profile optimization suggestions
- Case study framework for documenting projects

Projects should be realistic, achievable, and demonstrate relevant skills. Consider difficulty and time estimates.`,
      user: `Candidate:\n${candidateBlock(opts.candidate)}\n\nTarget roles: ${opts.targetRoles.join(", ")}\nExisting projects: ${opts.existingProjects?.join(", ") ?? "none listed"}`,
    });

    return result;
  } catch {
    return {
      project_ideas: [],
      portfolio_tips: ["Generation failed — try again"],
      github_suggestions: [],
      case_study_framework: "",
    };
  }
}
