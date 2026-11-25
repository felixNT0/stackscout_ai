import { connection } from "next/server";
import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { downloadFile, deleteFile } from "@/lib/storage";

/**
 * GET /api/videos/:id/stream — Stream a private video blob to the owner.
 * Supports HTTP Range requests for video seeking.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const video = await prisma.videoIntroduction.findFirst({
      where: { id, user_id: user.id },
    });
    if (!video) return jsonError("Video not found", 404);

    const buffer = await downloadFile(video.blob_pathname);
    const size = buffer.length;
    const range = req.headers.get("range");
    const contentType = video.mime_type ?? "video/webm";

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2]
          ? Math.min(parseInt(match[2], 10), size - 1)
          : size - 1;
        const chunk = buffer.subarray(start, end + 1);
        return new Response(new Uint8Array(chunk), {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunk.length),
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Length": String(size),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/videos/:id — Delete a video (owner only). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const video = await prisma.videoIntroduction.findFirst({
      where: { id, user_id: user.id },
    });
    if (!video) return jsonError("Video not found", 404);

    await prisma.videoIntroduction.delete({ where: { id } });
    await deleteFile(video.blob_pathname).catch(() => {});

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
