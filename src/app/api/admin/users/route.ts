import { requireAdmin } from "@/app/api/dashboard/stats/route";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!(await requireAdmin(user.id))) return jsonError("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = 25;

    const where = q
      ? {
          OR: [
            { full_name: { contains: q, mode: "insensitive" as const } },
            {
              professional_headline: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            { location: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        select: {
          id: true,
          user_id: true,
          full_name: true,
          professional_headline: true,
          location: true,
          role: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.profile.count({ where }),
    ]);

    return jsonOk({ users: data, total, page, page_size: pageSize });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const me = await prisma.profile.findUnique({
      where: { user_id: user.id },
      select: { role: true },
    });
    if (me?.role !== "super_admin")
      return jsonError("Only super admins can change roles", 403);

    const { user_id, role } = await req.json();
    if (!["user", "admin", "super_admin"].includes(role))
      return jsonError("Invalid role", 400);
    await prisma.profile.updateMany({
      where: { user_id },
      data: { role },
    });
    await prisma.adminAuditLog.create({
      data: {
        admin_id: user.id,
        action: "role_change",
        resource_type: "profile",
        resource_id: user_id,
        details: { role },
      },
    });
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
