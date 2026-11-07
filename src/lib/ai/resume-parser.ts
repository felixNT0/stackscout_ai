import { z } from "zod";
import { chatJson } from "./openai";

export const parsedResumeSchema = z.object({
  personal: z.object({
    full_name: z.string(),
    professional_headline: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    portfolio_url: z.string(),
    github_url: z.string(),
    linkedin_url: z.string(),
  }),
  summary: z.string(),
  total_years_experience: z.number(),
  experiences: z.array(
    z.object({
      job_title: z.string(),
      company: z.string(),
      location: z.string(),
      start_date: z.string(),
      end_date: z.string(),
      is_current: z.boolean(),
      responsibilities: z.array(z.string()),
      achievements: z.array(z.string()),
    }),
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      category: z.enum([
        "programming_language", "framework", "library", "database",
        "cloud_platform", "dev_tool", "testing_tool", "ai_tool",
        "soft_skill", "other",
      ]),
      proficiency: z.enum(["learning", "junior", "intermediate", "senior", "expert"]),
      years_experience: z.number().nullable(),
      is_professional: z.boolean(),
      evidence: z.string(),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field_of_study: z.string(),
      start_date: z.string(),
      end_date: z.string(),
      gpa: z.string(),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      url: z.string(),
      start_date: z.string(),
      end_date: z.string(),
      is_personal: z.boolean(),
    }),
  ),
  career_interests: z.array(z.string()),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

// JSON schema for OpenAI structured outputs (strict mode: all fields required)
const stringArray = { type: "array", items: { type: "string" } } as const;

export const RESUME_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["personal", "summary", "total_years_experience", "experiences", "skills", "education", "projects", "career_interests"],
  properties: {
    personal: {
      type: "object",
      additionalProperties: false,
      required: ["full_name", "professional_headline", "email", "phone", "location", "portfolio_url", "github_url", "linkedin_url"],
      properties: {
        full_name: { type: "string" },
        professional_headline: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        portfolio_url: { type: "string" },
        github_url: { type: "string" },
        linkedin_url: { type: "string" },
      },
    },
    summary: { type: "string" },
    total_years_experience: { type: "number" },
    experiences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["job_title", "company", "location", "start_date", "end_date", "is_current", "responsibilities", "achievements"],
        properties: {
          job_title: { type: "string" },
          company: { type: "string" },
          location: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          is_current: { type: "boolean" },
          responsibilities: stringArray,
          achievements: stringArray,
        },
      },
    },
    skills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "category", "proficiency", "years_experience", "is_professional", "evidence"],
        properties: {
          name: { type: "string" },
          category: { type: "string", enum: ["programming_language", "framework", "library", "database", "cloud_platform", "dev_tool", "testing_tool", "ai_tool", "soft_skill", "other"] },
          proficiency: { type: "string", enum: ["learning", "junior", "intermediate", "senior", "expert"] },
          years_experience: { anyOf: [{ type: "number" }, { type: "null" }] },
          is_professional: { type: "boolean" },
          evidence: { type: "string" },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["institution", "degree", "field_of_study", "start_date", "end_date", "gpa"],
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          field_of_study: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          gpa: { type: "string" },
        },
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "technologies", "url", "start_date", "end_date", "is_personal"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          technologies: stringArray,
          url: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          is_personal: { type: "boolean" },
        },
      },
    },
    career_interests: stringArray,
  },
} as const;

export async function parseResumeText(text: string): Promise<ParsedResume> {
  const raw = await chatJson<unknown>({
    schemaName: "parsed_resume",
    schema: RESUME_JSON_SCHEMA as unknown as Record<string, unknown>,
    system: `You extract structured candidate profiles from resume text. Rules:
- Use "" for missing strings and null for missing dates/numbers where the schema allows; for required string fields use "".
- Only mark a skill is_professional=true if the resume shows it used in a job/professional context; skills only listed under a skills section are is_professional=false with proficiency inferred conservatively.
- Distinguish professional experience from personal projects (is_personal=true for projects).
- Never invent employers, dates, degrees, or achievements. If unsure, leave the field empty.
- total_years_experience: estimate from dated work experiences; 0 if unknown.`,
    user: `Resume text:\n\n${text.slice(0, 50000)}`,
  });
  return parsedResumeSchema.parse(raw);
}
