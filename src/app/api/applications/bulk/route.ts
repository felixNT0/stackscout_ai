import { handleApiError, jsonError, jsonOk, parseBody, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: z.string().optional(),
});

/**
 * Bulk update or delete applications.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`bulk-applications:${user.id}`, 10, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const { ids, status } = await parseBody(req, bulkSchema);

    if (!status) return jsonError("Status is required", 400);

    const result = await prisma.application.updateMany({
      where: {
        id: { in: ids },
        user_id: user.id,
      },
      data: { status },
    });

    return jsonOk({
      updated: result.count,
      message: `${result.count} applications updated`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * Bulk delete applications.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`bulk-delete:${user.id}`, 5, 60_000))
      return jsonError("Rate limit exceeded. Try again in a minute.", 429);

    const body = await req.json();
    const { ids } = bulkSchema.parse(body);

    const result = await prisma.application.deleteMany({
      where: {
        id: { in: ids },
        user_id: user.id,
      },
    });

    return jsonOk({
      deleted: result.count,
      message: `${result.count} applications deleted`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
