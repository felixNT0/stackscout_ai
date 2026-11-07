import {handleApiError, jsonOk, parseBody, jsonError} from "@/lib/api";
import { prisma } from "@/lib/db";
import { notificationReadSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const where = {
      user_id: user.id,
      ...(unreadOnly ? { read: false } : {}),
    };
    const [data, unread_count] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: 100,
      }),
      prisma.notification.count({
        where: { user_id: user.id, read: false },
      }),
    ]);
    return jsonOk({ notifications: data, unread_count });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const input = await parseBody(req, notificationReadSchema);
    if (input.all) {
      await prisma.notification.updateMany({
        where: { user_id: user.id, read: false },
        data: { read: true },
      });
    } else if (input.ids?.length) {
      await prisma.notification.updateMany({
        where: { user_id: user.id, id: { in: input.ids } },
        data: { read: true },
      });
    }
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
