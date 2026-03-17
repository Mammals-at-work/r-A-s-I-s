import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedFetcher } from "../src/feeds/feed-fetcher.js";
import type { SourceConfig } from "../src/types.js";

const source: SourceConfig = {
  id: "source",
  name: "Source",
  feedUrl: "https://example.com/feed.xml",
  homepage: "https://example.com",
  language: "en",
  enabled: true,
  weight: 1
};

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example RSS</title>
    <item>
      <title>Breaking News Item</title>
      <link>https://example.com/news/1</link>
      <pubDate>Wed, 17 Mar 2026 08:00:00 GMT</pubDate>
      <description>Summary from RSS</description>
      <category>world</category>
    </item>
  </channel>
</rss>`;

const atomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom</title>
  <entry>
    <title>Atom Story</title>
    <link href="https://example.com/news/atom-1" />
    <updated>2026-03-17T08:30:00Z</updated>
    <summary>Atom summary</summary>
    <author><name>Reporter</name></author>
  </entry>
</feed>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FeedFetcher", () => {
  it("parses RSS 2.0 feeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(rssXml, {
          status: 200,
          headers: { "content-type": "application/rss+xml" }
        })
      )
    );

    const fetcher = new FeedFetcher(5_000);
    const items = await fetcher.fetchSource(source);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceId: "source",
      title: "Breaking News Item",
      canonicalUrl: "https://example.com/news/1",
      rawSummary: "Summary from RSS"
    });
  });

  it("parses Atom feeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(atomXml, {
          status: 200,
          headers: { "content-type": "application/atom+xml" }
        })
      )
    );

    const fetcher = new FeedFetcher(5_000);
    const items = await fetcher.fetchSource(source);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Atom Story",
      canonicalUrl: "https://example.com/news/atom-1",
      author: "Reporter"
    });
  });
});
