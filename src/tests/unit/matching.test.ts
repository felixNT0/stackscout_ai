import { describe, it, expect } from "vitest";
import { matchJobToCandidate, seniorityLabel, extractSkillsFromText, type MatchCandidate, type MatchJob } from "@/lib/matching/engine";

const candidate: MatchCandidate = {
  skills: [
    { skill_name: "React", is_professional: true, proficiency: "senior", years_experience: 4 },
    { skill_name: "TypeScript", is_professional: true, proficiency: "senior", years_experience: 4 },
    { skill_name: "Node.js", is_professional: true, proficiency: "intermediate", years_experience: 2 },
    { skill_name: "Python", is_professional: false, proficiency: "junior", years_experience: null },
  ],
  experiences: [
    { job_title: "Frontend Developer", company: "ShopCo", responsibilities: ["Built React dashboards", "Wrote TypeScript services"], achievements: [] },
  ],
  total_years_experience: 5,
  location: "Lagos, Nigeria",
};

const job: MatchJob = {
  title: "Senior Frontend Engineer",
  description: "We need React, TypeScript and Node.js experience. Build dashboards.",
  required_skills: ["React", "TypeScript", "GraphQL"],
  preferred_skills: ["Node.js"],
  responsibilities: ["Build React dashboards", "Mentor junior devs"],
  experience_level: "senior",
  location: "Remote",
  country: "US",
  remote_status: "remote",
  employment_type: "full-time",
};

describe("matchJobToCandidate", () => {
  it("produces a weighted score in 0-100 with subscores", () => {
    const r = matchJobToCandidate(candidate, job);
    expect(r.compatibility_score).toBeGreaterThanOrEqual(0);
    expect(r.compatibility_score).toBeLessThanOrEqual(100);
    for (const k of ["technical_stack_score", "experience_score", "responsibilities_score", "seniority_score", "location_score", "industry_score"] as const) {
      expect(r[k]).toBeGreaterThanOrEqual(0);
      expect(r[k]).toBeLessThanOrEqual(100);
    }
  });

  it("identifies matching and missing skills", () => {
    const r = matchJobToCandidate(candidate, job);
    expect(r.matching_skills.map((s) => s.toLowerCase())).toContain("react");
    expect(r.matching_skills.map((s) => s.toLowerCase())).toContain("typescript");
    expect(r.missing_skills.map((s) => s.toLowerCase())).toContain("graphql");
  });

  it("does not penalize unknown location as ineligible", () => {
    const r = matchJobToCandidate(candidate, { ...job, remote_status: null, location: null });
    expect(r.location_eligibility).toMatch(/unknown/i);
  });

  it("remote jobs score high on location", () => {
    const r = matchJobToCandidate(candidate, { ...job, remote_status: "remote" });
    expect(r.location_score).toBeGreaterThanOrEqual(85);
  });

  it("categorizes scores correctly", () => {
    const perfect = matchJobToCandidate(
      { ...candidate, skills: [
        { skill_name: "React", is_professional: true, proficiency: "expert", years_experience: 8 },
        { skill_name: "TypeScript", is_professional: true, proficiency: "expert", years_experience: 8 },
        { skill_name: "GraphQL", is_professional: true, proficiency: "senior", years_experience: 5 },
        { skill_name: "Node.js", is_professional: true, proficiency: "senior", years_experience: 5 },
      ], total_years_experience: 9 },
      job,
    );
    expect(["excellent", "strong", "good", "partial"]).toContain(perfect.category);
    expect(perfect.compatibility_score).toBeGreaterThan(50);
  });
});

describe("seniorityLabel", () => {
  it("maps years to levels", () => {
    expect(seniorityLabel(0)).toBe("entry");
    expect(seniorityLabel(2)).toBe("junior");
    expect(seniorityLabel(4)).toBe("mid");
    expect(seniorityLabel(7)).toBe("senior");
    expect(seniorityLabel(null)).toBe("unknown");
  });
});

describe("extractSkillsFromText", () => {
  it("finds known skills in text", () => {
    const skills = extractSkillsFromText("We use React, TypeScript and PostgreSQL daily");
    expect(skills).toContain("react");
    expect(skills).toContain("typescript");
    expect(skills).toContain("postgresql");
  });
});
