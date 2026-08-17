import { describe, expect, it } from "vitest";
import { lexicalDemoSearch } from "@/lib/retrieval";

describe("seeded retrieval", () => {
  it("ranks architecture evidence for a vector retrieval question", () => {
    const results = lexicalDemoSearch("How do vector retrieval embeddings and the HNSW index work?");
    expect(results[0].documentName).toBe("Retrieval architecture.md");
    expect(results[0].content).toMatch(/HNSW/i);
  });

  it("limits the evidence context", () => {
    expect(lexicalDemoSearch("quality evaluation citations", 2)).toHaveLength(2);
  });
});
