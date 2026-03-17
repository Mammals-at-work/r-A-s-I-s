import Parser from "rss-parser";

import type { SourceConfig, NormalizedItem } from "../types.js";
import { fetchWithTimeout } from "../lib/fetch.js";
import { stripHtml } from "../utils/text.js";

type ParserItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  contentEncoded?: string;
  creator?: string;
  author?: string;
  categories?: string[];
};

export class FeedFetcher {
  private readonly parser = new Parser<Record<string, never>, ParserItem>({
    customFields: {
      item: [["content:encoded", "contentEncoded"]]
    }
  });

  constructor(private readonly timeoutMs: number) {}

  async fetchSource(source: SourceConfig): Promise<NormalizedItem[]> {
    const response = await fetchWithTimeout(source.feedUrl, {}, this.timeoutMs);
    if (!response.ok) {
      throw new Error(`Feed request failed for ${source.id}: ${response.status}`);
    }

    const xml = await response.text();
    const feed = await this.parser.parseString(xml);

    return (feed.items ?? [])
      .map((item) => this.toNormalizedItem(source, item))
      .filter((item): item is NormalizedItem => item !== null);
  }

  private toNormalizedItem(source: SourceConfig, item: ParserItem): NormalizedItem | null {
    const canonicalUrl = item.link?.trim();
    const title = stripHtml(item.title ?? "").trim();
    const publishedAt = new Date(item.isoDate ?? item.pubDate ?? Date.now());

    if (!canonicalUrl || !title || Number.isNaN(publishedAt.getTime())) {
      return null;
    }

    const rawSummary = stripHtml(item.contentSnippet ?? item.content ?? "");
    const rawContent = stripHtml(item.contentEncoded ?? item.content ?? item.contentSnippet ?? "");

    return {
      sourceId: source.id,
      title,
      canonicalUrl,
      publishedAt,
      rawSummary,
      rawContent,
      author: item.creator ?? item.author ?? null,
      categories: item.categories ?? []
    };
  }
}
