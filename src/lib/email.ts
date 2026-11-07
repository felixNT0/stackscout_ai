import { config } from "@/config";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

/** Send an email via SMTP. Returns true on success. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const t = getTransporter();

  if (!t) {
    // No SMTP configured — log to console for development
    console.log(`[email] To: ${opts.to} | Subject: ${opts.subject}`);
    console.log(`[email] Body: ${opts.html.slice(0, 200)}...`);
    return true; // Return true so flow continues in dev
  }

  try {
    await t.sendMail({
      from: config.email.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

/** Send password reset email with reset link. */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
): Promise<boolean> {
  const resetUrl = `${config.app.url}/auth/reset-password/confirm?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: "Reset your StackScout AI password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
        <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

/** Send welcome email after signup. */
export async function sendWelcomeEmail(
  email: string,
  name?: string,
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Welcome to StackScout AI",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome${name ? `, ${name}` : ""}!</h2>
        <p>You're all set to start discovering your next career opportunity.</p>
        <p><a href="${config.app.url}/dashboard" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Go to Dashboard</a></p>
      </div>
    `,
  });
}

/** Send email verification link. */
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const verifyUrl = `${config.app.url}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  return sendEmail({
    to: email,
    subject: "Verify your StackScout AI email",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
        <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
        <p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
}
