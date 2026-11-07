import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const conv = await prisma.conversation.findFirst({
      where: { id, user_id: user.id },
      select: { id: true },
    });
    if (!conv) return jsonError("Conversation not found", 404);
    const messages = await prisma.message.findMany({
      where: { conversation_id: id },
      orderBy: { created_at: "asc" },
    });
    return jsonOk({ messages });
  } catch (err) {
    return handleApiError(err);
  }
}
