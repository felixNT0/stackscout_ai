/**
 * Fetch Greenhouse application form questions.
 * Public endpoint — no API key needed for questions.
 */
export interface GreenhouseQuestion {
  label: string;
  required: boolean;
  fields: {
    name: string;
    type: string;
    values?: { label: string; value: string }[];
  }[];
}

export interface GreenhouseJobQuestions {
  questions: GreenhouseQuestion[];
  location_questions?: GreenhouseQuestion[];
  compliance?: GreenhouseQuestion[];
  demographic_questions?: Record<string, unknown>;
}

export async function fetchGreenhouseQuestions(
  board: string,
  jobId: string,
): Promise<GreenhouseJobQuestions | null> {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(jobId)}?questions=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      questions: data.questions ?? [],
      location_questions: data.location_questions,
      compliance: data.compliance,
      demographic_questions: data.demographic_questions,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch Lever application form questions.
 * Requires LEVER_API_KEY for v1 API, or use v0 public endpoint.
 */
export interface LeverQuestion {
  id: string;
  type: string;
  text: string;
  description?: string;
  required: boolean;
  options?: { text: string; value: string }[];
}

export async function fetchLeverQuestions(
  company: string,
  postingId: string,
): Promise<LeverQuestion[] | null> {
  const apiKey = process.env.LEVER_API_KEY;
  if (!apiKey) return null; // Lever questions require API key

  try {
    const url = `https://api.lever.co/v1/postings/${encodeURIComponent(postingId)}/apply`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.questions ?? data.fields ?? [];
  } catch {
    return null;
  }
}
