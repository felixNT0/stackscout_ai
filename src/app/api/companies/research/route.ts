import { handleApiError, jsonError, jsonOk, parseBody, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { NextRequest } from "next/server";
import { z } from "zod";

const researchSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  location: z.string().optional(),
});

/**
 * Research a company — gather public info for job seekers.
 * Uses AI to synthesize company information.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`company-research:${user.id}`, 10, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const { company, location } = await parseBody(req, researchSchema);

    // Use AI to generate company research
    const { isAiConfigured, chatText } = await import("@/lib/ai/openai");
    if (!isAiConfigured()) {
      return jsonError("AI features require OPENAI_API_KEY", 400);
    }

    const prompt = `Research the company "${company}"${location ? ` located in ${location}` : ""} for a job seeker. Provide:

1. **Company Overview** — What they do, industry, size, headquarters
2. **Culture & Values** — Work environment, diversity, benefits
3. **Recent News** — Funding, acquisitions, product launches, layoffs
4. **Employee Reviews** — Common themes from Glassdoor/Indeed (positive and negative)
5. **Interview Process** — Typical interview stages and what to expect
6. **Compensation** — Typical salary ranges for common roles
7. **Red Flags** — Potential concerns (high turnover, toxic culture, etc.)
8. **Growth Opportunities** — Career advancement, learning budget, mentorship

Be factual and balanced. If information is limited, note that. Do not make up specifics. Provide actionable insights for a job seeker evaluating this opportunity.`;

    const research = await chatText({
      system: prompt,
      messages: [{
        role: "user",
        content: `Research ${company}${location ? ` in ${location}` : ""}. Focus on helping a job seeker decide if this is a good opportunity.`,
      }],
    });

    return jsonOk({
      company,
      location,
      research,
      researched_at: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
