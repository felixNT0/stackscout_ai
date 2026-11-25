import { chatJson, isAiConfigured } from "@/lib/ai/openai";

export type Difficulty = "easy" | "medium" | "hard";

export interface CodingProblem {
  title: string;
  problem_statement: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  hints: string[];
  starter_code: string;
  test_cases?: { input: string; expected_output: string }[];
}

export interface CodeEvaluation {
  score: number; // 0-100
  correctness: number; // 0-100
  time_complexity: string;
  space_complexity: string;
  feedback: string;
  issues: string[];
  suggestions: string[];
  is_correct: boolean;
}

const PROBLEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "problem_statement",
    "examples",
    "constraints",
    "hints",
    "starter_code",
  ],
  properties: {
    title: { type: "string" },
    problem_statement: { type: "string" },
    examples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["input", "output"],
        properties: {
          input: { type: "string" },
          output: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    constraints: { type: "array", items: { type: "string" } },
    hints: { type: "array", items: { type: "string" } },
    starter_code: { type: "string" },
    test_cases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["input", "expected_output"],
        properties: {
          input: { type: "string" },
          expected_output: { type: "string" },
        },
      },
    },
  },
} as const;

const EVAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "correctness",
    "time_complexity",
    "space_complexity",
    "feedback",
    "issues",
    "suggestions",
    "is_correct",
  ],
  properties: {
    score: { type: "number" },
    correctness: { type: "number" },
    time_complexity: { type: "string" },
    space_complexity: { type: "string" },
    feedback: { type: "string" },
    issues: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    is_correct: { type: "boolean" },
  },
} as const;

const FALLBACK_PROBLEMS: Record<string, CodingProblem> = {
  "two-sum": {
    title: "Two Sum",
    problem_statement:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume each input has exactly one solution.",
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    ],
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Only one valid answer exists"],
    hints: ["A hash map gives O(n) time", "For each element, check if target - num exists"],
    starter_code: "function twoSum(nums, target) {\n  // your code here\n}\n",
    test_cases: [
      { input: "[2,7,11,15], 9", expected_output: "[0,1]" },
      { input: "[3,2,4], 6", expected_output: "[1,2]" },
    ],
  },
};

/** Generate a coding problem via AI. Falls back to a built-in problem if AI unavailable. */
export async function generateCodingProblem(opts: {
  topic: string;
  difficulty: Difficulty;
  language: string;
}): Promise<CodingProblem> {
  if (!isAiConfigured()) {
    return FALLBACK_PROBLEMS["two-sum"];
  }

  try {
    const result = await chatJson<CodingProblem>({
      system: `You are an expert coding interview question writer. Generate ONE original coding problem. Rules:
- Difficulty must match the requested level (${opts.difficulty})
- Provide a clear problem statement, 2-3 examples with explanations, constraints, 2 hints, and starter code in ${opts.language}
- Include 2-3 hidden test cases for self-verification
- Problems should be realistic interview questions, not trick questions
- Be concise but complete`,
      user: `Topic: ${opts.topic}\nLanguage: ${opts.language}\nDifficulty: ${opts.difficulty}`,
      schemaName: "coding_problem",
      schema: PROBLEM_SCHEMA,
    });
    return result;
  } catch {
    return FALLBACK_PROBLEMS["two-sum"];
  }
}

/** Evaluate user-submitted code against the problem. */
export async function evaluateCode(opts: {
  problem: CodingProblem;
  code: string;
  language: string;
}): Promise<CodeEvaluation> {
  const fallback: CodeEvaluation = {
    score: 0,
    correctness: 0,
    time_complexity: "Unknown",
    space_complexity: "Unknown",
    feedback: "AI evaluation unavailable. Review your code manually against the test cases.",
    issues: [],
    suggestions: ["Check edge cases", "Verify time/space complexity", "Test with provided examples"],
    is_correct: false,
  };

  if (!isAiConfigured() || !opts.code.trim()) return fallback;

  try {
    const result = await chatJson<CodeEvaluation>({
      system: `You are a senior engineer reviewing a coding interview submission. Evaluate the code for:
1. Correctness — does it solve the problem? Would it pass hidden test cases?
2. Time/space complexity — state Big-O
3. Code quality — readability, edge cases, best practices

Be honest and constructive. Score 0-100 overall, correctness 0-100. List specific issues and actionable suggestions.`,
      user: `Problem: ${opts.problem.title}\n\n${opts.problem.problem_statement}\n\nExamples:\n${opts.problem.examples.map((e) => `Input: ${e.input}\nOutput: ${e.output}`).join("\n\n")}\n\nConstraints:\n${opts.problem.constraints.join("\n")}\n\nLanguage: ${opts.language}\n\nUser's code:\n\`\`\`${opts.language}\n${opts.code}\n\`\`\``,
      schemaName: "code_evaluation",
      schema: EVAL_SCHEMA,
    });
    return {
      ...result,
      score: Math.max(0, Math.min(100, Math.round(result.score))),
      correctness: Math.max(0, Math.min(100, Math.round(result.correctness))),
    };
  } catch {
    return fallback;
  }
}
