import { afterEach, describe, expect, it, vi } from "vitest";

import { Repository } from "../src/db/repository.js";
import { CurationService } from "../src/services/curation-service.js";
import type { ClassificationResult, NormalizedItem, SourceConfig, SummaryResult } from "../src/types.js";
import { createTestDatabase, createTestEnv } from "./helpers/test-env.js";

class FakeFeedFetcher {
  constructor(private readonly itemsBySource: Record<string, NormalizedItem[]>) {}

  async fetchSource(source: SourceConfig): Promise<NormalizedItem[]> {
    return this.itemsBySource[source.id] ?? [];
  }
}

class FakeArticleExtractor {
  async enrich(): Promise<{ summary: string; content: string }> {
    return {
      summary: "Summary from article fallback",
      content: "Long article fallback content."
    };
  }
}

class FakeLlmProvider {
  readonly name = "fake";

  async summarize(item: NormalizedItem): Promise<SummaryResult> {
    return {
      shortTitle: item.title,
      summaryEs: `Resumen: ${item.title}`,
      confidence: 0.9,
      providerName: this.name,
      modelName: "fake-model"
    };
  }

  async classify(item: NormalizedItem): Promise<ClassificationResult> {
    return {
      tags: item.categories.length ? item.categories : ["general"],
      confidence: 0.9
    };
  }
}

class ThrowingLlmProvider extends FakeLlmProvider {
  override async summarize(): Promise<SummaryResult> {
    throw new Error("LLM unavailable");
  }

  override async classify(): Promise<ClassificationResult> {
    throw new Error("LLM unavailable");
  }
}

function makeItem(overrides: Partial<NormalizedItem>): NormalizedItem {
  return {
    sourceId: "bbc-news",
    title: "AI startup raises new funding round",
    canonicalUrl: "https://example.com/news/ai-funding",
    publishedAt: new Date("2026-03-17T08:00:00Z"),
    rawSummary: "Short summary",
    rawContent: "Long enough content for the curator to work without article fallback. ".repeat(8),
    author: "Reporter",
    categories: ["ia", "negocio"],
    ...overrides
  };
}

const sources: SourceConfig[] = [
  {
    id: "bbc-news",
    name: "BBC News",
    feedUrl: "https://example.com/bbc.xml",
    homepage: "https://example.com",
    language: "en",
    enabled: true,
    weight: 2
  },
  {
    id: "nyt-home",
    name: "NYT",
    feedUrl: "https://example.com/nyt.xml",
    homepage: "https://example.com",
    language: "en",
    enabled: true,
    weight: 1
  }
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CurationService integration", () => {
  it("curates items, skips duplicates and is idempotent across runs", async () => {
    const db = await createTestDatabase();
    const repository = new Repository(db);
    const env = createTestEnv();

    const duplicateStory = makeItem({
      sourceId: "nyt-home",
      canonicalUrl: "https://example.com/news/duplicate-url",
      title: "AI startup raises funding in new round",
      publishedAt: new Date("2026-03-17T09:00:00Z")
    });

    const service = new CurationService(
      env,
      repository,
      new FakeFeedFetcher({
        "bbc-news": [
          makeItem({}),
          makeItem({
            canonicalUrl: "https://example.com/news/economy",
            title: "Markets close higher after inflation report",
            publishedAt: new Date("2026-03-17T07:00:00Z"),
            categories: ["economia"]
          })
        ],
        "nyt-home": [duplicateStory]
      }) as never,
      new FakeArticleExtractor() as never,
      new FakeLlmProvider(),
      sources
    );

    const firstRun = await service.refresh();
    const secondRun = await service.refresh();
    const feedItems = await repository.getFeedItems(50);

    expect(firstRun.processedCount).toBe(2);
    expect(firstRun.skippedDuplicates).toBe(1);
    expect(firstRun.curatedCount).toBe(2);
    expect(secondRun.curatedCount).toBe(0);
    expect(await repository.countRows("raw_items")).toBe(2);
    expect(await repository.countRows("curated_items")).toBe(2);
    expect(feedItems.map((item) => item.title)).toEqual([
      "AI startup raises new funding round",
      "Markets close higher after inflation report"
    ]);
  });

  it("falls back to extractive summaries when the LLM fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const db = await createTestDatabase();
    const repository = new Repository(db);
    const env = createTestEnv({ LLM_API_KEY: undefined });

    const service = new CurationService(
      env,
      repository,
      new FakeFeedFetcher({
        "bbc-news": [
          makeItem({
            rawSummary: "",
            rawContent: "Fallback content sentence one. Sentence two. Sentence three. Sentence four."
          })
        ]
      }) as never,
      new FakeArticleExtractor() as never,
      new ThrowingLlmProvider(),
      sources
    );

    await service.refresh();
    const items = await repository.getFeedItems(10);

    expect(items).toHaveLength(1);
    expect(items[0].qualityState).toBe("fallback");
    expect(items[0].descriptionHtml).toContain("<p>");
  });
});
