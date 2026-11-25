import { describe, expect, it } from "vitest";
import {
    analyzeSkillGaps,
    evaluateInterviewAnswer,
    generateCoverLetterVariants,
    generateFollowUpEmail,
    generateMockInterview,
    generateSalaryNegotiation,
    getCareerPathAdvice,
    getPortfolioSuggestions,
    predictInterviewQuestions,
    scoreResumeForJob,
} from "../../lib/ai/documents";
import type { JobAnalysis } from "../../lib/ai/job-analysis";
import type { MatchCandidate } from "../../lib/matching/engine";

const mockCandidate: MatchCandidate = {
  skills: [
    { skill_name: "React", proficiency: "expert", years_experience: 5, is_professional: true },
    { skill_name: "TypeScript", proficiency: "senior", years_experience: 4, is_professional: true },
    { skill_name: "Node.js", proficiency: "senior", years_experience: 4, is_professional: true },
  ],
  experiences: [
    {
      job_title: "Senior Frontend Developer",
      company: "Tech Corp",
      responsibilities: ["Led frontend team", "Built React apps"],
      achievements: ["Increased performance by 40%", "Mentored 3 junior developers"],
    },
  ],
  total_years_experience: 8,
};

const mockJobAnalysis: JobAnalysis = {
  required_skills: ["React", "TypeScript", "GraphQL"],
  preferred_skills: ["Next.js", "Tailwind CSS"],
  responsibilities: ["Build web applications", "Collaborate with designers"],
  experience_level: "senior",
  employment_type: "full-time",
  remote_status: "remote",
  salary_min: 120000,
  salary_max: 180000,
  salary_currency: "USD",
  salary_period: "annual",
  visa_sponsorship: true,
  benefits: ["Health insurance", "401k", "Remote work"],
};

describe("AI Documents Functions", () => {
  describe("scoreResumeForJob", () => {
    it("returns structured score when AI is not configured", async () => {
      const result = await scoreResumeForJob({
        candidate: mockCandidate,
        jobTitle: "Frontend Developer",
        company: "Tech Corp",
        jobAnalysis: mockJobAnalysis,
        jobDescription: "Build React applications",
      });

      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("breakdown");
      expect(result).toHaveProperty("strengths");
      expect(result).toHaveProperty("weaknesses");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("missing_keywords");
      expect(typeof result.score).toBe("number");
      expect(Array.isArray(result.strengths)).toBe(true);
    });
  });

  describe("analyzeSkillGaps", () => {
    it("returns structured skill gaps", async () => {
      const result = await analyzeSkillGaps({
        candidate: mockCandidate,
        jobTitle: "Full Stack Developer",
        company: "Tech Corp",
        jobAnalysis: mockJobAnalysis,
        jobDescription: "Full stack development",
      });

      expect(result).toHaveProperty("missing_skills");
      expect(result).toHaveProperty("partial_matches");
      expect(result).toHaveProperty("learning_resources");
      expect(result).toHaveProperty("upskilling_plan");
      expect(Array.isArray(result.missing_skills)).toBe(true);
      expect(Array.isArray(result.upskilling_plan)).toBe(true);
    });
  });

  describe("generateMockInterview", () => {
    it("returns interview questions and tips", async () => {
      const result = await generateMockInterview({
        candidate: mockCandidate,
        jobTitle: "Frontend Developer",
        company: "Tech Corp",
        jobAnalysis: mockJobAnalysis,
        jobDescription: "Build React applications",
        questionType: "mixed",
      });

      expect(result).toHaveProperty("questions");
      expect(result).toHaveProperty("tips");
      expect(Array.isArray(result.questions)).toBe(true);
      expect(Array.isArray(result.tips)).toBe(true);
    });
  });

  describe("evaluateInterviewAnswer", () => {
    it("returns evaluation score and feedback", async () => {
      const result = await evaluateInterviewAnswer({
        question: "Tell me about yourself",
        answer: "I am a software developer with 8 years of experience...",
        jobTitle: "Frontend Developer",
        company: "Tech Corp",
        candidate: mockCandidate,
      });

      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("feedback");
      expect(result).toHaveProperty("strengths");
      expect(result).toHaveProperty("improvements");
      expect(result).toHaveProperty("better_answer_framework");
      expect(typeof result.score).toBe("number");
    });
  });

  describe("generateSalaryNegotiation", () => {
    it("returns negotiation guidance", async () => {
      const result = await generateSalaryNegotiation({
        candidate: mockCandidate,
        jobTitle: "Frontend Developer",
        company: "Tech Corp",
        jobAnalysis: mockJobAnalysis,
        jobDescription: "Build React applications",
        currentSalary: 100000,
        targetSalary: 140000,
      });

      expect(result).toHaveProperty("market_analysis");
      expect(result).toHaveProperty("negotiation_script");
      expect(result).toHaveProperty("talking_points");
      expect(result).toHaveProperty("leverage_factors");
      expect(result).toHaveProperty("alternatives");
      expect(result).toHaveProperty("red_flags");
      expect(Array.isArray(result.talking_points)).toBe(true);
    });
  });

  describe("predictInterviewQuestions", () => {
    it("returns predicted questions", async () => {
      const result = await predictInterviewQuestions({
        candidate: mockCandidate,
        jobTitle: "Frontend Developer",
        company: "Tech Corp",
        jobAnalysis: mockJobAnalysis,
        jobDescription: "Build React applications",
      });

      expect(result).toHaveProperty("technical_questions");
      expect(result).toHaveProperty("behavioral_questions");
      expect(result).toHaveProperty("company_questions");
      expect(result).toHaveProperty("curveball_questions");
      expect(result).toHaveProperty("preparation_tips");
      expect(Array.isArray(result.technical_questions)).toBe(true);
    });
  });

  describe("generateCoverLetterVariants", () => {
    it("returns 4 cover letter variants", async () => {
      const result = await generateCoverLetterVariants({
        candidate: mockCandidate,
        jobTitle: "Frontend Developer",
        company: "Tech Corp",
        jobAnalysis: mockJobAnalysis,
        jobDescription: "Build React applications",
      });

      expect(result).toHaveProperty("formal");
      expect(result).toHaveProperty("enthusiastic");
      expect(result).toHaveProperty("concise");
      expect(result).toHaveProperty("creative");
      expect(typeof result.formal).toBe("string");
    });
  });

  describe("generateFollowUpEmail", () => {
    it("returns follow-up email", async () => {
      const result = await generateFollowUpEmail({
        candidate: mockCandidate,
        jobTitle: "Frontend Developer",
        company: "Tech Corp",
        jobAnalysis: mockJobAnalysis,
        jobDescription: "Build React applications",
        context: "application",
        interviewerName: "John Smith",
        daysSinceContact: 7,
      });

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("body");
      expect(result).toHaveProperty("tone");
      expect(result).toHaveProperty("tips");
      expect(typeof result.subject).toBe("string");
    });
  });

  describe("getCareerPathAdvice", () => {
    it("returns career path recommendations", async () => {
      const result = await getCareerPathAdvice({
        candidate: mockCandidate,
        currentRole: "Frontend Developer",
        yearsExperience: 8,
        targetIndustry: "fintech",
      });

      expect(result).toHaveProperty("current_trajectory");
      expect(result).toHaveProperty("recommended_paths");
      expect(result).toHaveProperty("skill_priorities");
      expect(result).toHaveProperty("timeline");
      expect(result).toHaveProperty("resources");
      expect(Array.isArray(result.recommended_paths)).toBe(true);
    });
  });

  describe("getPortfolioSuggestions", () => {
    it("returns portfolio suggestions", async () => {
      const result = await getPortfolioSuggestions({
        candidate: mockCandidate,
        targetRoles: ["Frontend Developer", "Full Stack Developer"],
        existingProjects: ["Personal blog"],
      });

      expect(result).toHaveProperty("project_ideas");
      expect(result).toHaveProperty("portfolio_tips");
      expect(result).toHaveProperty("github_suggestions");
      expect(result).toHaveProperty("case_study_framework");
      expect(Array.isArray(result.project_ideas)).toBe(true);
    });
  });
});
