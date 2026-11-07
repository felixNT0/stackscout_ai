import { NextResponse } from "next/server";

/**
 * DEPRECATED: This route handled Supabase OAuth code exchange.
 * NextAuth v4 handles OAuth callbacks automatically at
 * /api/auth/callback/[provider] (e.g. /api/auth/callback/google),
 * so this file can be safely deleted.
 *
 * Kept as a redirect so any stale links land on the dashboard.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
