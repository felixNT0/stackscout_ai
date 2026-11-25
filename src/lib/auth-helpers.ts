import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

/**
 * Get the current authenticated user from the NextAuth JWT session cookie.
 *
 * Uses `getToken` directly instead of `getServerSession`: NextAuth v4's
 * getServerSession defers `headers()` into an internal context that Next.js
 * Cache Components cannot attribute during prerendering, producing
 * "headers() rejects when the prerender is complete" build errors.
 * `connection()` marks the route dynamic up front; the token read then runs
 * purely at request time.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  await connection();
  const token = await getToken({
    req: {
      headers: await headers(),
      cookies: await cookies(),
    } as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) return null;
  const id = (token.id as string | undefined) ?? token.sub;
  if (!id) return null;
  return {
    id,
    email: (token.email as string | undefined) ?? null,
    name: (token.name as string | undefined) ?? null,
    image: (token.picture as string | undefined) ?? null,
  };
}

/** Get the current user's profile from the database. */
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.profile.findUnique({
    where: { user_id: user.id },
    include: {
      user: true,
    },
  });
}

/** Require authentication — returns user or throws. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
