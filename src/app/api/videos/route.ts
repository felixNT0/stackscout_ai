import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { connection, NextRequest } from "next/server";

const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
];

/**
 * GET /api/videos — List the current user's video introductions.
 * Query: application_id (optional filter)
 */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("application_id");

    const videos = await prisma.videoIntroduction.findMany({
      where: {
        user_id: user.id,
        ...(applicationId && { application_id: applicationId }),
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        application_id: true,
        job_id: true,
        blob_url: true,
        duration_seconds: true,
        file_size: true,
        mime_type: true,
        title: true,
        created_at: true,
      },
    });
    return jsonOk({ videos });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/videos — Upload a video introduction (multipart/form-data).
 * Fields: file (required), application_id?, job_id?, title?, duration_seconds?
 */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("file field is required", 422);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return jsonError(
        `Unsupported video type: ${file.type}. Use webm, mp4, or mov.`,
        422,
      );
    }
    if (file.size > MAX_SIZE) {
      return jsonError("Video exceeds 100MB limit", 413);
    }

    const applicationId = formData.get("application_id");
    const jobId = formData.get("job_id");
    const title = formData.get("title");
    const durationRaw = formData.get("duration_seconds");

    // Verify application ownership if provided
    if (typeof applicationId === "string" && applicationId) {
      const app = await prisma.application.findFirst({
        where: { id: applicationId, user_id: user.id },
        select: { id: true, job_id: true },
      });
      if (!app) return jsonError("Application not found", 404);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "video/mp4" ? "mp4" : file.type === "video/quicktime" ? "mov" : "webm";
    const pathname = `videos/${user.id}/${crypto.randomUUID()}.${ext}`;

    const { url } = await uploadFile(pathname, buffer, {
      contentType: file.type,
      access: "private",
    });

    const duration =
      typeof durationRaw === "string" && durationRaw
        ? parseInt(durationRaw, 10)
        : null;

    const video = await prisma.videoIntroduction.create({
      data: {
        user_id: user.id,
        application_id:
          typeof applicationId === "string" && applicationId
            ? applicationId
            : null,
        job_id:
          typeof jobId === "string" && jobId
            ? jobId
            : null,
        blob_url: url,
        blob_pathname: pathname,
        duration_seconds:
          duration !== null && !isNaN(duration) ? duration : null,
        file_size: file.size,
        mime_type: file.type,
        title: typeof title === "string" && title ? title : null,
      },
      select: {
        id: true,
        application_id: true,
        blob_url: true,
        duration_seconds: true,
        file_size: true,
        mime_type: true,
        title: true,
        created_at: true,
      },
    });

    return jsonOk({ video }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
