import { chatJson, isAiConfigured } from "./openai";

export interface ExtractedJob {
  title: string;
  company: string;
  location: string | null;
  description: string;
  employment_type: string | null;
  remote_status: "remote" | "hybrid" | "on-site" | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  required_skills: string[];
  preferred_skills: string[];
  application_url: string;
}

/**
 * Use AI to extract structured job data from raw text/html.
 * This is used when we find job listings via web search.
 */
export async function extractJobFromText(
  text: string,
  url: string,
): Promise<ExtractedJob | null> {
  if (!isAiConfigured() || !text.trim()) return null;

  try {
    const result = await chatJson<ExtractedJob>({
      system: `Extract job posting information from this text. If it's not a job posting, return null fields.
Rules:
- Only extract information explicitly stated in the text
- If a field is not mentioned, use null or empty array
- description should be the full job description text (up to 3000 chars)
- required_skills: skills explicitly required (not preferred)
- preferred_skills: nice-to-have skills
- remote_status: "remote", "hybrid", or "on-site" — null if not specified
- employment_type: "full-time", "part-time", "contract", "internship", "freelance" — null if not specified`,
      user: `URL: ${url}\n\nText:\n${text.slice(0, 8000)}`,
      schemaName: "job_extraction",
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          location: { type: ["string", "null"] },
          description: { type: "string" },
          employment_type: { type: ["string", "null"] },
          remote_status: {
            type: ["string", "null"],
            enum: ["remote", "hybrid", "on-site", null],
          },
          salary_min: { type: ["number", "null"] },
          salary_max: { type: ["number", "null"] },
          salary_currency: { type: ["string", "null"] },
          required_skills: { type: "array", items: { type: "string" } },
          preferred_skills: { type: "array", items: { type: "string" } },
          application_url: { type: "string" },
        },
        required: [
          "title",
          "company",
          "location",
          "description",
          "employment_type",
          "remote_status",
          "salary_min",
          "salary_max",
          "salary_currency",
          "required_skills",
          "preferred_skills",
          "application_url",
        ],
        additionalProperties: false,
      },
    });

    // Validate we got a real job
    if (!result.title || result.title === "Unknown") return null;
    return result;
  } catch {
    return null;
  }
}
