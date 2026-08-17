export type TextChunk = {
  index: number;
  content: string;
  tokenEstimate: number;
};

export function normalizeText(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(input: string, maxChars = 3000, overlapChars = 360): TextChunk[] {
  const text = normalizeText(input);
  if (!text) return [];
  if (overlapChars >= maxChars) throw new Error("Chunk overlap must be smaller than chunk size");

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const paragraph = text.lastIndexOf("\n\n", end);
      const sentence = text.lastIndexOf(". ", end);
      const boundary = Math.max(paragraph, sentence);
      if (boundary > start + Math.floor(maxChars * 0.55)) {
        end = boundary + (boundary === sentence ? 1 : 0);
      }
    }

    const content = text.slice(start, end).trim();
    if (content) {
      chunks.push({
        index: chunks.length,
        content,
        tokenEstimate: Math.ceil(content.length / 4),
      });
    }
    if (end === text.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}
