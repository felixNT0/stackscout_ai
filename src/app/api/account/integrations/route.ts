import { handleApiError, jsonError, jsonOk, parseBody, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/keys/crypto";
import { AI_PROVIDERS } from "@/lib/keys/store";
import { NextRequest } from "next/server";
import { z } from "zod";

const JOB_PROVIDERS = [
  "adzuna",
  "jooble",
  "tavily",
  "dice",
  "reed",
  "usajobs",
  "wellfound",
  "themuse",
  "careerjet",
  "lever",
] as const;

const ALL_PROVIDERS = [...AI_PROVIDERS, ...JOB_PROVIDERS] as const;

const upsertSchema = z.object({
  provider: z.enum(ALL_PROVIDERS),
  secret: z.string().min(4).max(500),
  label: z.string().max(100).optional(),
  is_primary: z.boolean().optional(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const SAFE_CONFIG_KEYS = new Set([
  "base_url",
  "model",
  "embedding_model",
  "app_id",
  "affid",
  "locale",
]);

/** GET /api/account/integrations — list configured keys (secrets masked). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const rows = await prisma.userApiKey.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        provider: true,
        label: true,
        config: true,
        is_primary: true,
        last_used_at: true,
        created_at: true,
        key_encrypted: true,
      },
    });

    return jsonOk({
      keys: rows.map((r) => ({
        id: r.id,
        provider: r.provider,
        label: r.label,
        config: r.config,
        is_primary: r.is_primary,
        last_used_at: r.last_used_at,
        created_at: r.created_at,
        configured: true,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/account/integrations — create or update a key. */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!(await rateLimit(`integrations:${user.id}`, 30, 60_000))) {
      return jsonError("Rate limit exceeded", 429);
    }

    const input = await parseBody(req, upsertSchema);

    // Sanitize config — only allow known non-secret fields
    const cleanConfig: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(input.config ?? {})) {
      if (SAFE_CONFIG_KEYS.has(k)) cleanConfig[k] = v;
    }

    const isAi = (AI_PROVIDERS as readonly string[]).includes(input.provider);

    // Enforce single primary AI key
    if (isAi && input.is_primary) {
      await prisma.userApiKey.updateMany({
        where: { user_id: user.id, is_primary: true },
        data: { is_primary: false },
      });
    }

    const key = await prisma.userApiKey.upsert({
      where: {
        user_id_provider: { user_id: user.id, provider: input.provider },
      },
      create: {
        user_id: user.id,
        provider: input.provider,
        label: input.label ?? null,
        key_encrypted: encryptSecret(input.secret),
        config: cleanConfig,
        is_primary: isAi ? (input.is_primary ?? true) : false,
      },
      update: {
        label: input.label ?? undefined,
        key_encrypted: encryptSecret(input.secret),
        config: cleanConfig,
        ...(isAi && input.is_primary !== undefined
          ? { is_primary: input.is_primary }
          : {}),
      },
      select: { id: true, provider: true, is_primary: true },
    });

    return jsonOk({ key }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/account/integrations — remove a key by provider or id. */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const id = url.searchParams.get("id");

    const where = id
      ? { id, user_id: user.id }
      : provider
        ? { provider, user_id: user.id }
        : null;
    if (!where) return jsonError("Provide provider or id", 422);

    const deleted = await prisma.userApiKey.deleteMany({ where });
    if (!deleted.count) return jsonError("Key not found", 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
