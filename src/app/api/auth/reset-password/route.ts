import { rateLimit } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const resetSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
});

/**
 * POST /api/auth/reset-password
 *
 * Requests a password reset. Generates a secure token and sends
 * a reset link via email.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 3 reset requests per hour per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!await rateLimit(`reset-password:${ip}`, 3, 3600_000)) {
    return NextResponse.json(
      { error: "Too many reset attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email" },
        { status: 400 },
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate secure reset token (32 bytes = 64 hex chars)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    });

    // Send reset email
    const sent = await sendPasswordResetEmail(normalizedEmail, token);
    if (!sent) {
      console.warn("Password reset email failed to send for user", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Password reset request failed:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
