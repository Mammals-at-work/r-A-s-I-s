import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(3000),
  FEED_TITLE: z.string().default("RSSAI"),
  FEED_DESCRIPTION: z.string().default("Resumen automatizado de noticias"),
  FEED_LANGUAGE: z.string().default("es"),
  FEED_MAX_ITEMS: z.coerce.number().int().positive().max(200).default(50),
  FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  LLM_PROVIDER: z.string().default("openai-compatible"),
  LLM_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("gpt-4.1-mini")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(env);
}
