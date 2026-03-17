import { newDb } from "pg-mem";

import type { AppEnv } from "../../src/config/env.js";
import type { DbClient } from "../../src/db/database.js";

export async function createTestDatabase(): Promise<DbClient> {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
    noAstCoverageCheck: true
  });
  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();
  return pool;
}

export function createTestEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    DATABASE_URL: "postgres://test/rssai",
    APP_BASE_URL: "http://localhost:3000",
    PORT: 3000,
    FEED_TITLE: "RSSAI",
    FEED_DESCRIPTION: "Resumen automatizado de noticias",
    FEED_LANGUAGE: "es",
    FEED_MAX_ITEMS: 50,
    FETCH_TIMEOUT_MS: 10_000,
    LLM_PROVIDER: "openai-compatible",
    LLM_BASE_URL: "https://api.openai.com/v1",
    LLM_API_KEY: "test-key",
    LLM_MODEL: "test-model",
    ...overrides
  };
}
