import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers.
 * Returns service status without exposing sensitive information.
 */
export async function GET() {
  const checks: Record<string, { status: "ok" | "error" | "warning"; message?: string }> = {};

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok" };
  } catch (err) {
    checks.database = {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check environment
  checks.environment = {
    status: process.env.NODE_ENV === "production" ? "ok" : "warning",
    message: process.env.NODE_ENV,
  };

  // Check AI configuration
  checks.ai = {
    status: process.env.OPENAI_API_KEY || process.env.AI_API_KEY ? "ok" : "warning",
    message: process.env.OPENAI_API_KEY || process.env.AI_API_KEY ? "configured" : "not configured",
  };

  // Check email configuration
  checks.email = {
    status: process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS ? "ok" : "warning",
    message: process.env.SMTP_HOST ? "configured" : "not configured",
  };

  // Check storage
  checks.storage = {
    status: process.env.BLOB_READ_WRITE_TOKEN ? "ok" : "warning",
    message: process.env.BLOB_READ_WRITE_TOKEN ? "configured" : "not configured",
  };

  const allOk = Object.values(checks).every((c) => c.status !== "error");
  const statusCode = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "1.0.0",
      checks,
    },
    { status: statusCode },
  );
}
