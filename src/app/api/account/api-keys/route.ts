import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { generateApiKey } from "@/lib/api-key-auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { connection, NextRequest } from "next/server";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(["read", "write", "admin"])).min(1).default(["read"]),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

/** List the current user's API keys (never returns the secret). */
export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const keys = await prisma.apiKey.findMany({
      where: { user_id: user.id, revoked_at: null },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        scopes: true,
        last_used_at: true,
        expires_at: true,
        created_at: true,
      },
    });
    return jsonOk({ keys });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Create a new API key. The plaintext key is returned ONCE. */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await parseBody(req, createKeySchema);

    // Limit: max 10 active keys per user
    const activeCount = await prisma.apiKey.count({
      where: { user_id: user.id, revoked_at: null },
    });
    if (activeCount >= 10) {
      return jsonError("Maximum of 10 active API keys reached", 400);
    }

    const { key, prefix, hash } = generateApiKey();
    const expiresAt = body.expires_in_days
      ? new Date(Date.now() + body.expires_in_days * 86400000)
      : null;

    const record = await prisma.apiKey.create({
      data: {
        user_id: user.id,
        name: body.name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: body.scopes,
        expires_at: expiresAt,
      },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        scopes: true,
        expires_at: true,
        created_at: true,
      },
    });

    return jsonOk(
      {
        key,
        api_key: record,
        warning:
          "Store this key securely — it will not be shown again. Send it as `Authorization: Bearer <key>` or `X-API-Key: <key>`.",
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
