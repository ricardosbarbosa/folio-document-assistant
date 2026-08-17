import { createHash } from "node:crypto";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { chunkText } from "@/lib/chunking";

const allowedTypes = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateFile(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Use a PDF, DOCX, Markdown, or text file");
  if (file.size > 10 * 1024 * 1024) throw new Error("Files must be 10 MB or smaller");
  if (file.size === 0) throw new Error("The file is empty");
}

export async function extractDocument(file: File) {
  validateFile(file);
  const data = Buffer.from(await file.arrayBuffer());
  let text = "";

  if (file.type === "application/pdf") {
    const parser = new PDFParse({ data });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (file.type.includes("wordprocessingml")) {
    text = (await mammoth.extractRawText({ buffer: data })).value;
  } else {
    text = data.toString("utf8");
  }

  const chunks = chunkText(text);
  if (!chunks.length) throw new Error("No readable text was found in the file");
  return {
    data,
    chunks,
    hash: createHash("sha256").update(data).digest("hex"),
  };
}
