export type DocumentRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  status: "ready" | "processing" | "failed";
  createdAt: string;
};

export type Source = {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
  page?: number;
};

export type QualityInspection = {
  groundedness: number;
  citationCoverage: number;
  answerRelevance: number;
  overall: number;
  verdict: "strong" | "review" | "weak";
  notes: string[];
  method: "model" | "heuristic";
};

export type StreamEvent =
  | { type: "sources"; sources: Source[]; responseId: string }
  | { type: "delta"; text: string }
  | { type: "quality"; quality: QualityInspection }
  | { type: "done" }
  | { type: "error"; message: string };
