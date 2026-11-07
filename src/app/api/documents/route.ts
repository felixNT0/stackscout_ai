import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const documents = await prisma.generatedDocument.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    return jsonOk({ documents });
  } catch (err) {
    return handleApiError(err);
  }
}
