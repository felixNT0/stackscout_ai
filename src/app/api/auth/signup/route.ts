import { rateLimit } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain a special character"),
  fullName: z.string().max(100).optional(),
});

/**
 * POST /api/auth/signup
 *
 * NextAuth has no built-in signup flow, so this route creates the user
 * (and the profile / preferences / settings rows) before the client
 * signs in via the credentials provider. Sends email verification.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per hour per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!await rateLimit(`signup:${ip}`, 5, 3600_000)) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { email, password, fullName } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: fullName || null,
        password: hashedPassword,
        profile: {
          create: {
            full_name: fullName || null,
          },
        },
      },
    });

    // Create default preference and settings rows
    await prisma.jobPreference.create({ data: { user_id: user.id } });
    await prisma.userSetting.create({ data: { user_id: user.id } });

    // Generate email verification token
    const verifyToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: verifyToken,
        expires: expiresAt,
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(normalizedEmail, verifyToken).catch((err) =>
      console.error("Failed to send verification email:", err),
    );

    // Send welcome email (non-blocking)
    sendWelcomeEmail(normalizedEmail, fullName).catch((err) =>
      console.error("Failed to send welcome email:", err),
    );

    return NextResponse.json({ userId: user.id }, { status: 201 });
  } catch (err) {
    console.error("Signup failed:", err);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }
}
