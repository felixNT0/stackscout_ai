import { evaluateCode, generateCodingProblem, type Difficulty } from "@/lib/ai/practice";
import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { connection, NextRequest } from "next/server";
import { z } from "zod";

const generateSchema = z.object({
  action: z.literal("generate"),
  topic: z.string().min(1).max(200),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  language: z.string().max(30).default("javascript"),
});

const evaluateSchema = z.object({
  action: z.literal("evaluate"),
  session_id: z.string().uuid(),
  code: z.string().min(1).max(50000),
});

const requestSchema = z.discriminatedUnion("action", [
  generateSchema,
  evaluateSchema,
]);

/**
 * POST /api/practice — Coding practice sessions.
 * action=generate: create a new problem session.
 * action=evaluate: submit code for AI evaluation.
 */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await parseBody(req, requestSchema);

    if (body.action === "generate") {
      const problem = await generateCodingProblem({
        topic: body.topic,
        difficulty: body.difficulty as Difficulty,
        language: body.language,
      });

      const session = await prisma.practiceSession.create({
        data: {
          user_id: user.id,
          topic: body.topic,
          difficulty: body.difficulty,
          language: body.language,
          problem: problem as object,
          attempts: 1,
        },
      });

      return jsonOk({ session_id: session.id, problem });
    }

    // evaluate
    const session = await prisma.practiceSession.findFirst({
      where: { id: body.session_id, user_id: user.id },
    });
    if (!session) return jsonError("Session not found", 404);

    const problem = session.problem as unknown as Parameters<
      typeof evaluateCode
    >[0]["problem"];
    const evaluation = await evaluateCode({
      problem,
      code: body.code,
      language: session.language,
    });

    await prisma.practiceSession.update({
      where: { id: session.id },
      data: {
        user_code: body.code,
        evaluation: evaluation as object,
        score: evaluation.score,
        attempts: { increment: 1 },
      },
    });

    return jsonOk({ evaluation });
  } catch (err) {
    return handleApiError(err);
  }
}

/** GET /api/practice — List user's practice history. */
export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const sessions = await prisma.practiceSession.findMany({
      where: { user_id: user.id },
      orderBy: { updated_at: "desc" },
      take: 20,
      select: {
        id: true,
        topic: true,
        difficulty: true,
        language: true,
        score: true,
        attempts: true,
        created_at: true,
        updated_at: true,
      },
    });
    return jsonOk({ sessions });
  } catch (err) {
    return handleApiError(err);
  }
}
