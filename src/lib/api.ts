import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status },
  );
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Validation failed", 422, error.flatten());
  }
  if (error instanceof Error) {
    // Log detailed error server-side, return generic message to client
    console.error(`[api] ${error.message}`, error.stack);
    return jsonError("Internal server error", 500);
  }
  return jsonError("Internal server error", 500);
}

export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<T> {
  const body = await req.json().catch(() => ({}));
  return schema.parse(body);
}

// --- Rate limiter: uses Upstash Redis if configured, falls back to in-memory ---
const buckets = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return null;

  try {
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", `rl:${key}`],
        ["PEXPIRE", `rl:${key}`, String(windowMs)],
        ["PTTL", `rl:${key}`],
      ]),
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 3) return null;

    const count = data[0]?.result ?? 0;
    const ttl = data[2]?.result ?? windowMs;
    const reset = Date.now() + ttl;

    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset,
    };
  } catch {
    return null;
  }
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }
  if (bucket.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: bucket.resetAt,
    };
  }
  bucket.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - bucket.count,
    reset: bucket.resetAt,
  };
}

/** Check rate limit. Returns true if allowed, false if exceeded. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const redis = await redisRateLimit(key, limit, windowMs);
  if (redis) return redis.success;
  return memoryRateLimit(key, limit, windowMs).success;
}

/** Get rate limit info for headers. */
export async function rateLimitInfo(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redis = await redisRateLimit(key, limit, windowMs);
  if (redis) return redis;
  return memoryRateLimit(key, limit, windowMs);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (
    fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
  );
}
