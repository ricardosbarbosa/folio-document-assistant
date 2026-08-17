import { config, runtimeMode } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    mode: runtimeMode(),
    capabilities: {
      generation: config.hasOpenAI && !config.demoMode,
      persistence: config.hasDatabase && !config.demoMode,
      uploads: config.hasDatabase && config.hasOpenAI && !config.demoMode && config.uploadsEnabled,
      seededCorpus: !config.hasDatabase || config.demoMode,
    },
  });
}
