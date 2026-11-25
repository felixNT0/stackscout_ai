import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";

export interface ApiKeyUser {
  id: string;
  email: string | null;
  name: string | null;
  scopes: string[];
  keyId: string;
}

const KEY_PREFIX = "ssk_";

/** Generate a new API key. Returns the plaintext key (shown once) and its hash. */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const random = randomBytes(24).toString("base64url");
  const key = `${KEY_PREFIX}${random}`;
  return {
    key,
    prefix: key.slice(0, 12),
    hash: hashApiKey(key),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Extract Bearer token or X-API-Key header from a request. */
export function extractApiKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  return req.headers.get("x-api-key");
}

/**
 * Authenticate a /api/v1 request via API key.
 * Returns the user + scopes, or null if invalid/expired/revoked.
 * Updates last_used_at asynchronously (fire-and-forget).
 */
export async function authenticateApiKey(
  req: NextRequest,
  requiredScope: "read" | "write" = "read",
): Promise<ApiKeyUser | null> {
  const key = extractApiKey(req);
  if (!key || !key.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(key);
  const apiKey = await prisma.apiKey.findUnique({
    where: { key_hash: hash },
  });

  if (!apiKey || apiKey.revoked_at) return null;
  if (apiKey.expires_at && apiKey.expires_at < new Date()) return null;
  if (!apiKey.scopes.includes(requiredScope) && !apiKey.scopes.includes("admin")) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: apiKey.user_id },
    select: { id: true, email: true, name: true, image: true },
  });
  if (!user) return null;

  // Fire-and-forget last_used update
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { last_used_at: new Date() } })
    .catch(() => {});

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    scopes: apiKey.scopes,
    keyId: apiKey.id,
  };
}
