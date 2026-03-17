import { describe, expect, it } from "vitest";

import { dedupeBatch, isNearDuplicate } from "../src/utils/dedupe.js";
import type { NormalizedItem } from "../src/types.js";

function makeItem(overrides: Partial<NormalizedItem>): NormalizedItem {
  return {
    sourceId: "source",
    title: "Markets rally after central bank comments",
    canonicalUrl: "https://example.com/news/1",
    publishedAt: new Date("2026-03-17T08:00:00Z"),
    rawSummary: "Summary",
    rawContent: "Longer content",
    author: null,
    categories: ["economy"],
    ...overrides
  };
}

describe("dedupe utilities", () => {
  it("detects near duplicate titles published close together", () => {
    const left = makeItem({});
    const right = makeItem({
      title: "Markets rally after comments from central bank",
      canonicalUrl: "https://example.com/news/2",
      publishedAt: new Date("2026-03-17T10:00:00Z")
    });

    expect(isNearDuplicate(left, right)).toBe(true);
  });

  it("keeps distinct stories", () => {
    const result = dedupeBatch([
      makeItem({}),
      makeItem({
        title: "Sports finals end in upset",
        canonicalUrl: "https://example.com/news/3"
      })
    ]);

    expect(result.unique).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });
});
