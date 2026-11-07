import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const resumes = await prisma.resume.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        user_id: true,
        file_name: true,
        file_size: true,
        file_type: true,
        status: true,
        error_message: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
    });
    return jsonOk({ resumes });
  } catch (err) {
    return handleApiError(err);
  }
}
