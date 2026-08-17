import { describe, expect, it } from "vitest";
import { demoSources } from "@/lib/demo";
import { heuristicQuality, qualitySchema } from "@/lib/quality";

describe("quality inspection", () => {
  it("gives fully cited relevant paragraphs a strong result", () => {
    const result = heuristicQuality(
      "How does retrieval work?",
      "Retrieval uses vector embeddings and cosine distance [S1].\n\nIt returns relevant source evidence [S2].",
      demoSources.slice(0, 2),
    );
    expect(result.groundedness).toBe(1);
    expect(result.citationCoverage).toBe(1);
    expect(result.overall).toBeGreaterThanOrEqual(0.8);
  });

  it("flags missing citations for review", () => {
    const result = heuristicQuality("What is measured?", "Groundedness is measured without a source.", demoSources);
    expect(result.citationCoverage).toBe(0);
    expect(result.verdict).not.toBe("strong");
  });

  it("enforces the structured response contract", () => {
    expect(() => qualitySchema.parse({ groundedness: 2 })).toThrow();
  });
});
