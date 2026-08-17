import { config } from "@/lib/config";
import { demoSources } from "@/lib/demo";
import { getOpenAI } from "@/lib/openai";
import { findSimilar } from "@/lib/repository";
import type { Source } from "@/lib/types";

function terms(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
}

export function lexicalDemoSearch(question: string, limit = 4): Source[] {
  const queryTerms = terms(question);
  return demoSources
    .map((source) => {
      const sourceTerms = terms(source.content);
      const overlap = [...queryTerms].filter((term) => sourceTerms.has(term)).length;
      return { ...source, score: Math.min(0.98, source.score * 0.7 + overlap * 0.08) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function retrieve(question: string) {
  if (config.demoMode || !config.hasDatabase) return lexicalDemoSearch(question);
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY is not configured");
  const response = await openai.embeddings.create({
    model: config.embeddingModel,
    input: question,
    encoding_format: "float",
  });
  return findSimilar(response.data[0].embedding);
}

export function evidencePrompt(sources: Source[]) {
  return sources
    .map((source, index) => `[S${index + 1}] ${source.documentName}\n${source.content}`)
    .join("\n\n");
}
