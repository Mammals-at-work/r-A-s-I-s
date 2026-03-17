import type { IncomingMessage, ServerResponse } from "node:http";

import type { AppEnv } from "./config/env.js";
import { Repository } from "./db/repository.js";
import { renderRss } from "./rss/render-rss.js";

export function createHttpHandler(env: AppEnv, repository: Repository) {
  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!req.url) {
      res.writeHead(400).end("Missing request URL");
      return;
    }

    const url = new URL(req.url, env.APP_BASE_URL);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/rss.xml") {
      await repository.ensureSchema();
      const items = await repository.getFeedItems(env.FEED_MAX_ITEMS);
      const xml = renderRss(items, env);
      res.writeHead(200, { "content-type": "application/rss+xml; charset=utf-8" });
      res.end(xml);
      return;
    }

    res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
  };
}
