import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Set it to your Postgres connection string (e.g. postgresql://user:pass@host:5432/db?sslmode=require).",
    );
  }
  // For Supabase pooler (self-signed certs), add sslmode=require to DATABASE_URL
  // and set DATABASE_SSL_INSECURE=true. Neon and other providers work without this.
  const adapter = new PrismaPg(
    process.env.DATABASE_SSL_INSECURE === "true"
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : connectionString,
  );
  return new PrismaClient({ adapter });
}

/** True when a database connection string is configured. */
export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

/**
 * Prisma client — direct Postgres access (bypasses Supabase RLS; ownership is
 * enforced in application code via user_id filters). Server-side only.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
