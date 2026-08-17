export const config = {
  chatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-5-mini",
  evalModel: process.env.OPENAI_EVAL_MODEL ?? "gpt-5-mini",
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
  hasDatabase: Boolean(process.env.DATABASE_URL),
  demoMode: process.env.DEMO_MODE === "true",
};

export function runtimeMode() {
  if (config.demoMode) return "demo" as const;
  if (config.hasOpenAI && config.hasDatabase) return "production" as const;
  return "portfolio" as const;
}
