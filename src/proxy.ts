import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true; // Allow non-browser requests (curl, etc.)
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // CSRF protection: verify Origin header for state-changing requests
  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    if (!isSameOrigin(request)) {
      return NextResponse.json(
        { error: "Cross-origin request blocked" },
        { status: 403 },
      );
    }
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Protect admin API routes — require auth + admin role
  if (pathname.startsWith("/api/admin")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect all API routes except public ones
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const response = NextResponse.next();

  // Add security headers to all responses
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/admin/:path*",
    "/api/((?!auth|inngest).*)",
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest|opengraph-image|robots.txt|sitemap.xml).*)",
  ],
};
