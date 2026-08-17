import { config } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!config.uploadsEnabled) {
    return Response.json(
      { error: "Uploads are disabled in this public workspace. Run the project locally to test document ingestion." },
      { status: 403 },
    );
  }
  if (config.demoMode || !config.hasDatabase) {
    return Response.json(
      { error: "Connect PostgreSQL to enable persistent uploads. The seeded corpus remains available." },
      { status: 503 },
    );
  }
  const [{ extractDocument }, { getOpenAI }, { insertDocument }] = await Promise.all([
    import("@/lib/documents"),
    import("@/lib/openai"),
    import("@/lib/repository"),
  ]);
  const openai = getOpenAI();
  if (!openai) return Response.json({ error: "OpenAI is not configured" }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a document to upload" }, { status: 400 });
    const extracted = await extractDocument(file);
    const embedding = await openai.embeddings.create({
      model: config.embeddingModel,
      input: extracted.chunks.map((chunk) => chunk.content),
      encoding_format: "float",
    });
    const id = await insertDocument({
      name: file.name,
      type: file.type,
      size: file.size,
      hash: extracted.hash,
      chunks: extracted.chunks,
      embeddings: embedding.data.map((item) => item.embedding),
    });
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The document could not be processed";
    const status = /already|must|empty|readable|Use a/.test(message) ? 400 : 500;
    if (status === 500) {
      console.error("Document upload failed", error);
    }
    return Response.json(
      { error: status === 400 ? message : "The document could not be processed. Please try another file." },
      { status },
    );
  }
}
