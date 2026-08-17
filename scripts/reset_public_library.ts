import { createHash } from "node:crypto";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const { config } = await import("../lib/config");
const { transaction } = await import("../lib/db");
const { demoSources } = await import("../lib/demo");
const { getOpenAI } = await import("../lib/openai");

const confirmation = process.env.CONFIRM_PUBLIC_LIBRARY_RESET;

if (confirmation !== "RESET") {
  throw new Error(
    "This command replaces every document, answer, and evaluation. Set CONFIRM_PUBLIC_LIBRARY_RESET=RESET to continue.",
  );
}

const openai = getOpenAI();
if (!openai) throw new Error("OPENAI_API_KEY is not configured");
if (!config.hasDatabase) throw new Error("DATABASE_URL is not configured");

const grouped = new Map<string, string[]>();
for (const source of demoSources) {
  const passages = grouped.get(source.documentName) ?? [];
  passages.push(source.content);
  grouped.set(source.documentName, passages);
}

type PreparedDocument = {
  name: string;
  passages: string[];
  embeddings: number[][];
  hash: string;
};

const prepared: PreparedDocument[] = [];
for (const [name, passages] of grouped) {
  const embedding = await openai.embeddings.create({
    model: config.embeddingModel,
    input: passages,
    encoding_format: "float",
  });
  prepared.push({
    name,
    passages,
    embeddings: embedding.data.map((item) => item.embedding),
    hash: createHash("sha256").update(passages.join("\n\n")).digest("hex"),
  });
}

await transaction(async (client) => {
  await client.query("DELETE FROM evaluations");
  await client.query("DELETE FROM responses");
  await client.query("DELETE FROM documents");

  for (const document of prepared) {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO documents (name, mime_type, size_bytes, content_hash, status)
       VALUES ($1, $2, $3, $4, 'ready') RETURNING id`,
      [document.name, "text/plain", Buffer.byteLength(document.passages.join("\n\n")), document.hash],
    );
    const documentId = inserted.rows[0].id;

    for (let index = 0; index < document.passages.length; index += 1) {
      const content = document.passages[index];
      await client.query(
        `INSERT INTO chunks (document_id, chunk_index, content, token_estimate, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [documentId, index, content, Math.ceil(content.length / 4), `[${document.embeddings[index].join(",")}]`],
      );
    }
  }
});

console.log(`Public library reset with ${prepared.length} curated documents.`);
