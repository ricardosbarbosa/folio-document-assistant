import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../lib/config";
import { demoAnswer } from "../lib/demo";
import { getOpenAI } from "../lib/openai";
import { heuristicQuality, inspectQuality } from "../lib/quality";
import { evidencePrompt, lexicalDemoSearch } from "../lib/retrieval";

type BenchmarkCase = {
  id: string;
  question: string;
  expectedDocument: string;
  requiredTerms: string[];
};

async function generate(question: string) {
  const sources = lexicalDemoSearch(question);
  if (process.env.LIVE_EVAL !== "true") return { answer: demoAnswer(question, sources), sources };
  const openai = getOpenAI();
  if (!openai) throw new Error("LIVE_EVAL requires OPENAI_API_KEY");
  const response = await openai.responses.create({
    model: config.chatModel,
    input: [
      { role: "system", content: "Answer only from the evidence. Cite factual paragraphs with [S1] labels. Never invent a source." },
      { role: "user", content: `Question:\n${question}\n\nEvidence:\n${evidencePrompt(sources)}` },
    ],
  });
  return { answer: response.output_text, sources };
}

async function main() {
  const cases = JSON.parse(await readFile(resolve("evals/benchmark.json"), "utf8")) as BenchmarkCase[];
  const results = [];

  for (const item of cases) {
    const startedAt = performance.now();
    const { answer, sources } = await generate(item.question);
    const quality = process.env.LIVE_EVAL === "true"
      ? await inspectQuality(item.question, answer, sources)
      : heuristicQuality(item.question, answer, sources);
    const retrievalHit = sources.slice(0, 2).some((source) => source.documentName === item.expectedDocument);
    const termCoverage = item.requiredTerms.filter((term) => answer.toLowerCase().includes(term.toLowerCase())).length / item.requiredTerms.length;
    const citationsPresent = /\[S\d+\]/.test(answer);
    results.push({
      id: item.id,
      retrievalHit,
      termCoverage,
      citationsPresent,
      quality,
      latencyMs: Math.round(performance.now() - startedAt),
      answer,
    });
  }

  const summary = {
    mode: process.env.LIVE_EVAL === "true" ? "live" : "deterministic",
    generatedAt: new Date().toISOString(),
    retrievalRecall: results.filter((result) => result.retrievalHit).length / results.length,
    citationRate: results.filter((result) => result.citationsPresent).length / results.length,
    averageQuality: results.reduce((total, result) => total + result.quality.overall, 0) / results.length,
    cases: results,
  };

  await mkdir(resolve("output/evals"), { recursive: true });
  await writeFile(resolve("output/evals/latest.json"), JSON.stringify(summary, null, 2));
  console.table(results.map((result) => ({
    case: result.id,
    retrieval: result.retrievalHit,
    terms: `${Math.round(result.termCoverage * 100)}%`,
    citations: result.citationsPresent,
    quality: result.quality.overall.toFixed(2),
    latency: `${result.latencyMs}ms`,
  })));

  if (summary.retrievalRecall < 1 || summary.citationRate < 1 || summary.averageQuality < 0.72) {
    throw new Error("Evaluation gate failed");
  }
  console.log(`Evaluation gate passed in ${summary.mode} mode`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
