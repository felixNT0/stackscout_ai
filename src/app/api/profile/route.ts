import {handleApiError, jsonOk, jsonError} from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  preferencesUpdateSchema,
  profileUpdateSchema,
} from "@/lib/validations";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const [profile, prefs] = await Promise.all([
      prisma.profile.findUnique({ where: { user_id: user.id } }),
      prisma.jobPreference.findUnique({ where: { user_id: user.id } }),
    ]);
    return jsonOk({ profile: profile ?? null, preferences: prefs ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const body = await req.json().catch(() => ({}));
    const out: Record<string, unknown> = {};

    if (body.profile) {
      const input = profileUpdateSchema.parse(body.profile);
      const data = await prisma.profile.upsert({
        where: { user_id: user.id },
        create: { user_id: user.id, ...input },
        update: { ...input },
      });
      out.profile = data;
    }

    if (body.preferences) {
      const input = preferencesUpdateSchema.parse(body.preferences);
      const data = await prisma.jobPreference.upsert({
        where: { user_id: user.id },
        create: { user_id: user.id, ...input },
        update: { ...input },
      });
      out.preferences = data;
    }

    return jsonOk(out);
  } catch (err) {
    return handleApiError(err);
  }
}
