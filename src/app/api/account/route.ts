import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { del } from "@vercel/blob";

/** Permanently delete the user's account and all associated data. */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    const userId = user.id;

    // List resume files for blob cleanup
    const resumes = await prisma.resume.findMany({
      where: { user_id: userId },
      select: { file_path: true },
    });

    // Delete resume files from Vercel Blob (best-effort)
    await Promise.all(
      resumes.map((r) =>
        del(r.file_path, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(
          () => {},
        ),
      ),
    );

    // Delete app-table rows keyed by user_id (no FK to User, so no cascade).
    // Application events and messages cascade from their parents.
    await Promise.all([
      prisma.jobSearch.deleteMany({ where: { user_id: userId } }),
      prisma.savedJob.deleteMany({ where: { user_id: userId } }),
      prisma.application.deleteMany({ where: { user_id: userId } }),
      prisma.jobMatch.deleteMany({ where: { user_id: userId } }),
      prisma.resume.deleteMany({ where: { user_id: userId } }),
      prisma.candidateProfile.deleteMany({ where: { user_id: userId } }),
      prisma.generatedDocument.deleteMany({ where: { user_id: userId } }),
      prisma.notification.deleteMany({ where: { user_id: userId } }),
      prisma.conversation.deleteMany({ where: { user_id: userId } }),
      prisma.searchAlert.deleteMany({ where: { user_id: userId } }),
      prisma.userSetting.deleteMany({ where: { user_id: userId } }),
      prisma.jobPreference.deleteMany({ where: { user_id: userId } }),
    ]);

    // Delete the NextAuth user — cascades remove accounts, sessions, and profile
    await prisma.user.delete({ where: { id: userId } });

    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
