import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

/** Get the current authenticated user from NextAuth session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
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
