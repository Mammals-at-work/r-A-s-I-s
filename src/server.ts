import { createServer } from "node:http";

import { createHttpHandler } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createDatabase } from "./db/database.js";
import { Repository } from "./db/repository.js";

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
const repository = new Repository(database);

async function main(): Promise<void> {
  await repository.ensureSchema();

  const server = createServer(createHttpHandler(env, repository));
  server.listen(env.PORT, () => {
    console.log(`RSSAI listening on ${env.APP_BASE_URL}`);
  });
}

main().catch(async (error) => {
  console.error(error);
  if (database.end) {
    await database.end();
  }
  process.exitCode = 1;
});
