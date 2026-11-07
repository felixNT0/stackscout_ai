import mammoth from "mammoth";
import { extractText } from "unpdf";

const MAX_CHARS = 60_000;

/** Extract raw text from an uploaded resume buffer. */
export async function extractResumeText(
  buffer: Buffer,
  fileType: string,
): Promise<string> {
  let text = "";
  if (fileType === "application/pdf") {
    const result = await extractText(new Uint8Array(buffer));
    // unpdf returns text as array of strings (one per page)
    text = Array.isArray(result.text)
      ? result.text.join("\n")
      : (result.text ?? "");
  } else if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (fileType === "text/plain") {
    text = buffer.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
  return text.replace(/\r\n/g, "\n").slice(0, MAX_CHARS);
}
