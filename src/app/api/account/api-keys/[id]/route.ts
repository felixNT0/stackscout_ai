import { connection, NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

/** Revoke (soft-delete) an API key. Only the owner can revoke their keys. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.user_id !== user.id) {
      return jsonError("API key not found", 404);
    }

    await prisma.apiKey.update({
      where: { id },
      data: { revoked_at: new Date() },
    });
    return jsonOk({ revoked: true });
  } catch (err) {
    return handleApiError(err);
  }
}
