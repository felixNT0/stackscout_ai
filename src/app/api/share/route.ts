import { connection, NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

const createSchema = z.object({
  type: z.enum(["profile", "matches", "application"]).default("profile"),
  target_id: z.string().uuid().optional(),
  expires_in_days: z.number().int().min(1).max(90).optional(),
});

function generateToken() {
  return randomBytes(24).toString("base64url");
}

/** GET /api/share — List the current user's share links. */
export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const links = await prisma.shareLink.findMany({
      where: { user_id: user.id, revoked_at: null },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        token: true,
        type: true,
        target_id: true,
        expires_at: true,
        view_count: true,
        created_at: true,
      },
    });
    return jsonOk({ links });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/share — Create a public share link. */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await parseBody(req, createSchema);

    // Validate target ownership for application type
    if (body.type === "application" && body.target_id) {
      const app = await prisma.application.findFirst({
        where: { id: body.target_id, user_id: user.id },
        select: { id: true },
      });
      if (!app) return jsonError("Application not found", 404);
    }

    // Limit active links
    const activeCount = await prisma.shareLink.count({
      where: { user_id: user.id, revoked_at: null },
    });
    if (activeCount >= 20) {
      return jsonError("Maximum of 20 active share links", 400);
    }

    const link = await prisma.shareLink.create({
      data: {
        user_id: user.id,
        token: generateToken(),
        type: body.type,
        target_id: body.target_id ?? null,
        expires_at: body.expires_in_days
          ? new Date(Date.now() + body.expires_in_days * 86400000)
          : null,
      },
      select: {
        id: true,
        token: true,
        type: true,
        target_id: true,
        expires_at: true,
        created_at: true,
      },
    });

    return jsonOk({ link }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/share — Revoke a share link by id (query param). */
export async function DELETE(req: NextRequest) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("id query param required", 422);

    const link = await prisma.shareLink.findFirst({
      where: { id, user_id: user.id },
    });
    if (!link) return jsonError("Share link not found", 404);

    await prisma.shareLink.update({
      where: { id },
      data: { revoked_at: new Date() },
    });
    return jsonOk({ revoked: true });
  } catch (err) {
    return handleApiError(err);
  }
}
