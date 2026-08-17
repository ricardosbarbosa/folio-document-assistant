import type { PoolClient } from "pg";
import { demoDocuments } from "@/lib/demo";
import { getPool, query, transaction } from "@/lib/db";
import { config } from "@/lib/config";
import type { DocumentRecord, QualityInspection, Source } from "@/lib/types";
import type { TextChunk } from "@/lib/chunking";

type DocumentRow = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentRecord["status"];
  created_at: Date;
  chunk_count: string;
};

export async function listDocuments(): Promise<DocumentRecord[]> {
  if (config.demoMode || !getPool()) return demoDocuments;
  const result = await query<DocumentRow>(`
    SELECT d.*, count(c.id)::text AS chunk_count
    FROM documents d
    LEFT JOIN chunks c ON c.document_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  `);
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.mime_type,
    size: row.size_bytes,
    chunkCount: Number(row.chunk_count),
    status: row.status,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function insertDocument(input: {
  name: string;
  type: string;
  size: number;
  hash: string;
  chunks: TextChunk[];
  embeddings: number[][];
}) {
  return transaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM documents WHERE content_hash = $1",
      [input.hash],
    );
    if (existing.rowCount) throw new Error("This document has already been uploaded");

    const document = await client.query<{ id: string }>(
      `INSERT INTO documents (name, mime_type, size_bytes, content_hash)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.name, input.type, input.size, input.hash],
    );
    const id = document.rows[0].id;
    await insertChunks(client, id, input.chunks, input.embeddings);
    await client.query("UPDATE documents SET status = 'ready' WHERE id = $1", [id]);
    return id;
  });
}

async function insertChunks(client: PoolClient, documentId: string, chunks: TextChunk[], embeddings: number[][]) {
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    await client.query(
      `INSERT INTO chunks (document_id, chunk_index, content, token_estimate, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)`,
      [documentId, chunk.index, chunk.content, chunk.tokenEstimate, `[${embeddings[index].join(",")}]`],
    );
  }
}

export async function findSimilar(embedding: number[], limit = 5): Promise<Source[]> {
  const vector = `[${embedding.join(",")}]`;
  const result = await query<{
    id: string;
    document_id: string;
    name: string;
    chunk_index: number;
    content: string;
    page_number: number | null;
    score: number;
  }>(
    `SELECT c.id, c.document_id, d.name, c.chunk_index, c.content, c.page_number,
      1 - (c.embedding <=> $1::vector) AS score
     FROM chunks c JOIN documents d ON d.id = c.document_id
     WHERE d.status = 'ready'
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    [vector, limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    documentName: row.name,
    chunkIndex: row.chunk_index,
    content: row.content,
    score: Number(row.score),
    page: row.page_number ?? undefined,
  }));
}

export async function createResponse(question: string, model: string) {
  if (config.demoMode || !getPool()) return crypto.randomUUID();
  const result = await query<{ id: string }>(
    "INSERT INTO responses (question, model) VALUES ($1, $2) RETURNING id",
    [question, model],
  );
  return result.rows[0].id;
}

export async function completeResponse(input: {
  id: string;
  answer: string;
  sources: Source[];
  latencyMs: number;
  quality: QualityInspection;
}) {
  if (config.demoMode || !getPool()) return;
  await transaction(async (client) => {
    await client.query(
      `UPDATE responses SET answer = $2, source_ids = $3, latency_ms = $4, status = 'complete' WHERE id = $1`,
      [input.id, input.answer, input.sources.map((source) => source.id), input.latencyMs],
    );
    await client.query(
      `INSERT INTO evaluations
       (response_id, groundedness, citation_coverage, answer_relevance, overall, verdict, notes, method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.id,
        input.quality.groundedness,
        input.quality.citationCoverage,
        input.quality.answerRelevance,
        input.quality.overall,
        input.quality.verdict,
        JSON.stringify(input.quality.notes),
        input.quality.method,
      ],
    );
  });
}
