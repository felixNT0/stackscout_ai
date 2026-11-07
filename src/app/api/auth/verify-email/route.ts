import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const verifySchema = z.object({
  token: z.string().min(1, "Verification token is required"),
  email: z.string().email("Invalid email"),
});

/**
 * POST /api/auth/verify-email
 *
 * Verifies a user's email using the token sent during signup.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { token, email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find verification token
    const verification = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        token,
        expires: { gt: new Date() },
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 },
      );
    }

    // Mark email as verified and delete token
    await prisma.$transaction([
      prisma.user.update({
        where: { email: normalizedEmail },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: normalizedEmail,
            token,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email verification failed:", err);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 },
    );
  }
}
