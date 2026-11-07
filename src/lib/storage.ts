import { del, get, list, put } from "@vercel/blob";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!TOKEN) {
  console.warn("BLOB_READ_WRITE_TOKEN not set — file uploads will fail");
}

/** Upload a file to Vercel Blob. Returns the blob URL and pathname. */
export async function uploadFile(
  pathname: string,
  body: Buffer | Blob | string,
  options?: { contentType?: string; access?: "public" | "private" },
): Promise<{ url: string; pathname: string }> {
  if (!TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN not configured");

  const blob = await put(pathname, body, {
    access: options?.access ?? "private",
    token: TOKEN,
    ...(options?.contentType && { contentType: options.contentType }),
  });

  return { url: blob.url, pathname: blob.pathname };
}

/** Download a file from Vercel Blob by pathname. */
export async function downloadFile(pathname: string): Promise<Buffer> {
  if (!TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN not configured");

  const result = await get(pathname, {
    access: "private",
    token: TOKEN,
  });

  if (!result || result.statusCode !== 200) {
    throw new Error(`File not found: ${pathname}`);
  }

  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/** Delete a file from Vercel Blob. */
export async function deleteFile(pathname: string): Promise<void> {
  if (!TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN not configured");
  await del(pathname, { token: TOKEN });
}

/** List files with a prefix. */
export async function listFiles(prefix: string) {
  if (!TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN not configured");
  const { blobs } = await list({ prefix, token: TOKEN });
  return blobs;
}
