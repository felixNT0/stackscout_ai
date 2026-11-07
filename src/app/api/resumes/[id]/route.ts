import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { del } from "@vercel/blob";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const resume = await prisma.resume.findFirst({
      where: { id, user_id: user.id },
    });
    if (!resume) return jsonError("Resume not found", 404);
    // extracted_text can be large; include a preview only
    return jsonOk({
      resume: {
        ...resume,
        extracted_text: resume.extracted_text?.slice(0, 2000) ?? null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { id } = await params;
    const resume = await prisma.resume.findFirst({
      where: { id, user_id: user.id },
      select: { id: true, file_path: true },
    });
    if (!resume) return jsonError("Resume not found", 404);

    await del(resume.file_path, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }).catch(() => {});
    await prisma.resume.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
