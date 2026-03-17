import { loadEnv } from "../config/env.js";
import { sources } from "../config/sources.js";
import { createDatabase } from "../db/database.js";
import { Repository } from "../db/repository.js";
import { ArticleExtractor } from "../feeds/article-extractor.js";
import { FeedFetcher } from "../feeds/feed-fetcher.js";
import { createLlmProvider } from "../llm/factory.js";
import { CurationService } from "../services/curation-service.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const database = createDatabase(env.DATABASE_URL);
  const repository = new Repository(database);
  const service = new CurationService(
    env,
    repository,
    new FeedFetcher(env.FETCH_TIMEOUT_MS),
    new ArticleExtractor(env.FETCH_TIMEOUT_MS),
    createLlmProvider(env),
    sources
  );

  try {
    const stats = await service.refresh();
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    if (database.end) {
      await database.end();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
