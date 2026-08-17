import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { config } from "@/lib/config";
import { getOpenAI } from "@/lib/openai";
import type { QualityInspection, Source } from "@/lib/types";

export const qualitySchema = z.object({
  groundedness: z.number().min(0).max(1),
  citationCoverage: z.number().min(0).max(1),
  answerRelevance: z.number().min(0).max(1),
  overall: z.number().min(0).max(1),
  verdict: z.enum(["strong", "review", "weak"]),
  notes: z.array(z.string()).max(4),
});

export function heuristicQuality(question: string, answer: string, sources: Source[]): QualityInspection {
  const paragraphs = answer.split(/\n\n+/).filter(Boolean);
  const cited = paragraphs.filter((paragraph) => /\[S\d+\]/.test(paragraph)).length;
  const citationCoverage = paragraphs.length ? cited / paragraphs.length : 0;
  const validCitations = [...answer.matchAll(/\[S(\d+)\]/g)].filter(
    (match) => Number(match[1]) <= sources.length,
  ).length;
  const totalCitations = [...answer.matchAll(/\[S(\d+)\]/g)].length;
  const groundedness = totalCitations ? validCitations / totalCitations : 0;
  const questionTerms = new Set(question.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
  const answerTerms = new Set(answer.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
  const matches = [...questionTerms].filter((term) => answerTerms.has(term)).length;
  const answerRelevance = questionTerms.size ? Math.min(1, 0.55 + matches / questionTerms.size) : 0.7;
  const overall = groundedness * 0.45 + citationCoverage * 0.3 + answerRelevance * 0.25;
  return {
    groundedness,
    citationCoverage,
    answerRelevance,
    overall,
    verdict: overall >= 0.8 ? "strong" : overall >= 0.55 ? "review" : "weak",
    notes: [
      citationCoverage === 1 ? "Every answer paragraph includes a source reference." : "Some paragraphs need a source reference.",
      "This local check validates citation shape and topical overlap, not factual entailment.",
    ],
    method: "heuristic",
  };
}

export async function inspectQuality(question: string, answer: string, sources: Source[]) {
  const fallback = heuristicQuality(question, answer, sources);
  if (config.demoMode) return fallback;
  const openai = getOpenAI();
  if (!openai) return fallback;

  try {
    const result = await openai.responses.parse({
      model: config.evalModel,
      input: [
        {
          role: "system",
          content:
            "Grade the answer only against the supplied evidence. Penalize unsupported claims. Scores range from 0 to 1. Keep notes concise and actionable.",
        },
        {
          role: "user",
          content: `Question:\n${question}\n\nAnswer:\n${answer}\n\nEvidence:\n${sources
            .map((source, index) => `[S${index + 1}] ${source.content}`)
            .join("\n\n")}`,
        },
      ],
      text: { format: zodTextFormat(qualitySchema, "quality_inspection") },
    });
    if (!result.output_parsed) return fallback;
    return { ...result.output_parsed, method: "model" as const };
  } catch {
    return fallback;
  }
}
