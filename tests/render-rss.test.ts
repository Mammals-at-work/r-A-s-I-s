import { describe, expect, it } from "vitest";

import { renderRss } from "../src/rss/render-rss.js";
import type { FeedItemRecord } from "../src/types.js";
import { createTestEnv } from "./helpers/test-env.js";

describe("renderRss", () => {
  it("renders a valid RSS envelope with content:encoded", () => {
    const items: FeedItemRecord[] = [
      {
        guid: "https://example.com/news/1",
        title: "Titular",
        link: "https://example.com/news/1",
        pubDate: new Date("2026-03-17T08:00:00Z"),
        descriptionHtml: "<p>Resumen</p>",
        contentHtml: "<p>Cuerpo</p>",
        sourceName: "Example",
        tags: ["ia"],
        qualityState: "llm_curated"
      }
    ];

    const xml = renderRss(items, createTestEnv());

    expect(xml).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("<content:encoded><![CDATA[<p>Cuerpo</p>]]></content:encoded>");
    expect(xml).toContain("<title>Titular</title>");
  });
});
