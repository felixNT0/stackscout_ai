import { runAssistant } from "@/lib/ai/assistant";
import { loadAssistantContext } from "@/lib/ai/context";
import {
  handleApiError,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { assistantMessageSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`ai-assistant:${user.id}`, 30, 60_000))
      return jsonError("Rate limit exceeded", 429);

    const input = await parseBody(req, assistantMessageSchema);

    // Resolve or create conversation
    let conversationId = input.conversation_id;
    if (!conversationId) {
      const conv = await prisma.conversation.create({
        data: { user_id: user.id, title: input.message.slice(0, 80) },
        select: { id: true },
      });
      conversationId = conv.id;
    } else {
      const conv = await prisma.conversation.findFirst({
        where: { id: conversationId, user_id: user.id },
        select: { id: true },
      });
      if (!conv) return jsonError("Conversation not found", 404);
    }

    const history = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      select: { role: true, content: true },
      orderBy: { created_at: "asc" },
      take: 20,
    });

    const context = await loadAssistantContext(user.id);
    const reply = await runAssistant({
      history: history as { role: "user" | "assistant"; content: string }[],
      message: input.message,
      context,
    });

    await prisma.message.createMany({
      data: [
        {
          conversation_id: conversationId,
          role: "user",
          content: input.message,
        },
        { conversation_id: conversationId, role: "assistant", content: reply },
      ],
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updated_at: new Date() },
    });

    return jsonOk({ conversation_id: conversationId, reply });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const convos = await prisma.conversation.findMany({
      where: { user_id: user.id },
      select: { id: true, title: true, created_at: true, updated_at: true },
      orderBy: { updated_at: "desc" },
      take: 50,
    });
    return jsonOk({ conversations: convos });
  } catch (err) {
    return handleApiError(err);
  }
}
