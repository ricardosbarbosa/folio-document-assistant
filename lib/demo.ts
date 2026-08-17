import type { DocumentRecord, Source } from "@/lib/types";

export const demoDocuments: DocumentRecord[] = [
  {
    id: "demo-product",
    name: "Product discovery brief.txt",
    type: "text/plain",
    size: 4280,
    chunkCount: 3,
    status: "ready",
    createdAt: "2026-08-12T14:00:00.000Z",
  },
  {
    id: "demo-architecture",
    name: "Retrieval architecture.md",
    type: "text/markdown",
    size: 6120,
    chunkCount: 4,
    status: "ready",
    createdAt: "2026-08-13T10:30:00.000Z",
  },
  {
    id: "demo-evaluation",
    name: "Quality evaluation plan.txt",
    type: "text/plain",
    size: 3890,
    chunkCount: 3,
    status: "ready",
    createdAt: "2026-08-14T09:15:00.000Z",
  },
];

export const demoSources: Source[] = [
  {
    id: "source-product-1",
    documentId: "demo-product",
    documentName: "Product discovery brief.txt",
    chunkIndex: 0,
    score: 0.92,
    content:
      "The first release is designed for analysts who repeatedly search policy, research, and project documents. Their primary need is a trustworthy answer that remains easy to verify. Every material claim should point to a visible source excerpt, and users should be able to inspect why an answer was judged reliable.",
  },
  {
    id: "source-architecture-1",
    documentId: "demo-architecture",
    documentName: "Retrieval architecture.md",
    chunkIndex: 1,
    score: 0.89,
    content:
      "Documents are normalized into overlapping chunks and embedded with text embedding 3 small. PostgreSQL stores the source text, document lineage, and 1536 dimension vectors. Query embeddings are compared with cosine distance through an HNSW index. The answer model receives only the highest scoring evidence and must cite source labels such as S1 and S2.",
  },
  {
    id: "source-evaluation-1",
    documentId: "demo-evaluation",
    documentName: "Quality evaluation plan.txt",
    chunkIndex: 0,
    score: 0.86,
    content:
      "Response quality is measured on groundedness, citation coverage, and answer relevance. A strong answer scores at least 0.8 overall and includes a citation for each factual paragraph. Automated model grading is useful for iteration, but deterministic checks and a small reviewed benchmark set are required to detect regressions.",
  },
  {
    id: "source-architecture-2",
    documentId: "demo-architecture",
    documentName: "Retrieval architecture.md",
    chunkIndex: 2,
    score: 0.79,
    content:
      "The service streams answer tokens over newline delimited JSON so the interface can render evidence before generation completes. Retrieval metadata and final quality scores are separate typed events. If a dependency is unavailable, health reporting exposes the degraded capability rather than silently pretending it succeeded.",
  },
  {
    id: "source-evaluation-2",
    documentId: "demo-evaluation",
    documentName: "Quality evaluation plan.txt",
    chunkIndex: 1,
    score: 0.75,
    content:
      "The benchmark contains answerable, partially answerable, and unanswerable questions. Expected source names are recorded for each case. The release gate checks retrieval recall, citation presence, unsupported claim rate, latency, and error handling before a prompt or model change is accepted.",
  },
];

export function demoAnswer(question: string, sources: Source[]) {
  const names = sources.slice(0, 3).map((source) => source.documentName);
  if (/evaluation|quality|measure|reliable/i.test(question)) {
    return `The assistant treats quality as something visible and testable. It scores groundedness, citation coverage, and answer relevance, with 0.8 as the threshold for a strong result [S1]. It also combines model grading with deterministic checks and a reviewed benchmark, since one evaluator alone can miss regressions [S1].\n\nFor release decisions, the benchmark includes answerable, partial, and unanswerable questions and tracks retrieval recall, unsupported claims, latency, and failure behavior [S2].`;
  }
  if (/architecture|retrieval|vector|work/i.test(question)) {
    return `The retrieval path converts documents into overlapping chunks, creates 1536 dimension embeddings, and stores them with source lineage in PostgreSQL [S1]. At question time, cosine similarity over an HNSW index selects the strongest evidence before the answer model runs [S1].\n\nThe response is delivered as typed streaming events, so sources appear first, answer text arrives incrementally, and the quality inspection follows when grading completes [S2].`;
  }
  return `The evidence suggests that the product is built for analysts who need answers they can verify, not just fluent generated text [S1]. Its main trust mechanism is visible source evidence for material claims, paired with an inspectable quality judgment [S1].\n\nThe current answer used ${names.join(", ")} as its evidence set. Ask about retrieval architecture or evaluation to inspect those decisions in more detail.`;
}
