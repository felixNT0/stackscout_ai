import {handleApiError, jsonOk, parseBody, jsonError} from "@/lib/api";
import { prisma } from "@/lib/db";
import { settingsUpdateSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";

const DEFAULTS = {
  theme: "system",
  email_notifications: true,
  in_app_notifications: true,
  search_alerts: true,
  resume_visibility: "private",
  ai_data_processing: true,
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const data = await prisma.userSetting.findUnique({
      where: { user_id: user.id },
    });
    return jsonOk({ settings: data ?? { user_id: user.id, ...DEFAULTS } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const input = await parseBody(req, settingsUpdateSchema);
    const data = await prisma.userSetting.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id, ...DEFAULTS, ...input },
      update: { ...input },
    });
    return jsonOk({ settings: data });
  } catch (err) {
    return handleApiError(err);
  }
}
