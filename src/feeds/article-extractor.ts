import * as cheerio from "cheerio";

import { fetchWithTimeout } from "../lib/fetch.js";
import { normalizeWhitespace } from "../utils/text.js";

export class ArticleExtractor {
  constructor(private readonly timeoutMs: number) {}

  async enrich(url: string): Promise<{ summary: string; content: string }> {
    const response = await fetchWithTimeout(url, {}, this.timeoutMs);
    if (!response.ok) {
      throw new Error(`Article request failed: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const summary = normalizeWhitespace(
      $('meta[name="description"]').attr("content") ??
        $('meta[property="og:description"]').attr("content") ??
        ""
    );

    const selectors = ["article", "main", '[role="main"]', "body"];
    for (const selector of selectors) {
      const text = normalizeWhitespace(
        $(selector)
          .find("p")
          .map((_, element) => $(element).text())
          .get()
          .join(" ")
      );

      if (text.length >= 320) {
        return { summary, content: text };
      }
    }

    return { summary, content: normalizeWhitespace($.text()) };
  }
}
