import { chatJson, isAiConfigured } from "./openai";

export interface ExpandedQuery {
  original: string;
  expanded: string[];
  synonyms: string[];
  related: string[];
}

/**
 * Use AI to expand a job search query into related terms.
 * "react developer" → ["frontend engineer", "javascript developer", "react.js engineer", ...]
 */
export async function expandSearchQuery(query: string): Promise<ExpandedQuery> {
  if (!isAiConfigured()) {
    return { original: query, expanded: [query], synonyms: [], related: [] };
  }

  try {
    const result = await chatJson<{
      expanded: string[];
      synonyms: string[];
      related: string[];
    }>({
      system: `You are a job search expert. Given a job title or search query, generate:
- expanded: 3-5 alternative job titles that mean the same thing (e.g., "React Developer" → "Frontend Engineer", "JavaScript Developer", "React.js Engineer")
- synonyms: 3-5 related skills or technologies commonly associated with this role
- related: 3-5 adjacent job titles that might interest the same candidate

Return ONLY valid JSON matching the schema. Keep each list to 3-5 items. Be specific to the tech industry.`,
      user: `Expand this job search query: "${query}"`,
      schemaName: "query_expansion",
      schema: {
        type: "object",
        properties: {
          expanded: {
            type: "array",
            items: { type: "string" },
            description: "Alternative job titles meaning the same thing",
          },
          synonyms: {
            type: "array",
            items: { type: "string" },
            description: "Related skills or technologies",
          },
          related: {
            type: "array",
            items: { type: "string" },
            description: "Adjacent job titles",
          },
        },
        required: ["expanded", "synonyms", "related"],
        additionalProperties: false,
      },
    });

    return {
      original: query,
      expanded: result.expanded ?? [],
      synonyms: result.synonyms ?? [],
      related: result.related ?? [],
    };
  } catch {
    return { original: query, expanded: [query], synonyms: [], related: [] };
  }
}

/** Generate a comprehensive search query combining original + expanded terms */
export function buildExpandedQuery(expanded: ExpandedQuery): string {
  const allTerms = [
    expanded.original,
    ...expanded.expanded.slice(0, 3), // Limit to top 3 expansions
  ];
  return allTerms.join(" OR ");
}
