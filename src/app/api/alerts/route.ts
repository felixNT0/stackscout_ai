import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { searchAlertSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const data = await prisma.searchAlert.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
    });
    return jsonOk({ alerts: data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const input = await parseBody(req, searchAlertSchema);
    const data = await prisma.searchAlert.create({
      data: { user_id: user.id, ...input },
    });
    return jsonOk({ alert: data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  filters: searchAlertSchema.shape.filters.optional(),
  frequency: z.enum(["daily", "twice_daily", "weekly"]).optional(),
  minimum_match_score: z.number().int().min(0).max(100).nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const input = await parseBody(req, patchSchema);
    const { id, ...updates } = input;
    const existing = await prisma.searchAlert.findFirst({
      where: { id, user_id: user.id },
      select: { id: true },
    });
    if (!existing) return jsonError("Alert not found", 404);
    const data = await prisma.searchAlert.update({
      where: { id },
      data: { ...updates },
    });
    return jsonOk({ alert: data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("id query param required", 400);
    await prisma.searchAlert.deleteMany({
      where: { id, user_id: user.id },
    });
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
