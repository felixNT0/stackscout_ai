import { handleApiError, jsonError, jsonOk, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";
import { NextRequest } from "next/server";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
};
const MAX_SIZE = 10 * 1024 * 1024;

/** Validate file magic numbers to prevent MIME type spoofing. */
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") {
    // PDF files start with %PDF
    return buffer.length > 4 && buffer.slice(0, 4).toString("ascii") === "%PDF";
  }
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // DOCX files are ZIP archives (PK\x03\x04)
    return (
      buffer.length > 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
      (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
    );
  }
  if (mimeType === "text/plain") {
    // TXT files should not contain null bytes in first 1KB
    const sample = buffer.slice(0, 1024);
    return !sample.includes(0x00);
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Unauthorized", 401);
    if (!await rateLimit(`resume-upload:${user.id}`, 10, 60_000))
      return jsonError("Rate limit exceeded", 429);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("No file provided", 400);
    if (!ALLOWED_TYPES[file.type]) {
      return jsonError("Unsupported file type. Upload PDF, DOCX, or TXT.", 415);
    }
    if (file.size > MAX_SIZE) return jsonError("File exceeds 10MB limit", 413);
    if (file.size === 0) return jsonError("File is empty", 400);

    const resumeId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const path = `${user.id}/${resumeId}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate file signature (magic numbers) to prevent MIME type spoofing
    if (!validateFileSignature(buffer, file.type)) {
      return jsonError("File content does not match declared type", 400);
    }

    await put(path, buffer, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type,
    });

    const resume = await prisma.resume.create({
      data: {
        id: resumeId,
        user_id: user.id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        file_type: file.type,
        status: "pending",
      },
    });

    return jsonOk({ resume }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
