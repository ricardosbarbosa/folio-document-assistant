import { z } from "zod";
import { config } from "@/lib/config";
import { demoAnswer } from "@/lib/demo";
import { getOpenAI } from "@/lib/openai";
import { inspectQuality } from "@/lib/quality";
import { completeResponse, createResponse } from "@/lib/repository";
import { evidencePrompt, retrieve } from "@/lib/retrieval";
import type { StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({ question: z.string().trim().min(3).max(1000) });

function encode(event: StreamEvent) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a question between 3 and 1000 characters" }, { status: 400 });

  const question = parsed.data.question;
  const sources = await retrieve(question);
  const responseId = await createResponse(question, config.chatModel);
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encode({ type: "sources", sources, responseId }));
      let answer = "";
      try {
        if (config.demoMode || !config.hasOpenAI) {
          const generated = demoAnswer(question, sources);
          for (const token of generated.match(/.{1,24}/g) ?? []) {
            answer += token;
            controller.enqueue(encode({ type: "delta", text: token }));
          }
        } else {
          const openai = getOpenAI();
          if (!openai) throw new Error("OpenAI is not configured");
          const response = await openai.responses.create({
            model: config.chatModel,
            stream: true,
            input: [
              {
                role: "system",
                content:
                  "You answer questions only from supplied evidence. Cite every factual paragraph with one or more labels like [S1]. If the evidence is insufficient, say exactly what is missing. Never invent a source. Use concise prose.",
              },
              {
                role: "user",
                content: `Question:\n${question}\n\nEvidence:\n${evidencePrompt(sources)}`,
              },
            ],
          });
          for await (const event of response) {
            if (event.type === "response.output_text.delta") {
              answer += event.delta;
              controller.enqueue(encode({ type: "delta", text: event.delta }));
            }
          }
        }

        const quality = await inspectQuality(question, answer, sources);
        await completeResponse({
          id: responseId,
          answer,
          sources,
          latencyMs: Date.now() - startedAt,
          quality,
        });
        controller.enqueue(encode({ type: "quality", quality }));
        controller.enqueue(encode({ type: "done" }));
      } catch (error) {
        controller.enqueue(
          encode({ type: "error", message: error instanceof Error ? error.message : "The answer could not be generated" }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
