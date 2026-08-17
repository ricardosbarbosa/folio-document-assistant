import { describe, expect, it } from "vitest";
import { chunkText, normalizeText } from "@/lib/chunking";

describe("document chunking", () => {
  it("normalizes noisy whitespace", () => {
    expect(normalizeText(" First   line\r\n\r\n\r\nSecond\tline ")).toBe("First line\n\nSecond line");
  });

  it("creates bounded overlapping chunks without dropping the ending", () => {
    const input = Array.from({ length: 40 }, (_, index) => `Paragraph ${index} contains evidence about retrieval and citations.`).join("\n\n");
    const chunks = chunkText(input, 320, 50);
    expect(chunks.length).toBeGreaterThan(4);
    expect(chunks.every((chunk) => chunk.content.length <= 320)).toBe(true);
    expect(chunks.at(-1)?.content).toContain("Paragraph 39");
    expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, index) => index));
  });

  it("rejects overlap that cannot make forward progress", () => {
    expect(() => chunkText("Useful evidence", 100, 100)).toThrow(/overlap/i);
  });
});
