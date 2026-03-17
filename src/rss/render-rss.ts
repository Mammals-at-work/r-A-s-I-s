import type { AppEnv } from "../config/env.js";
import type { FeedItemRecord } from "../types.js";
import { escapeXml } from "../utils/html.js";

export function renderRss(items: FeedItemRecord[], env: AppEnv): string {
  const now = new Date().toUTCString();
  const channelItems = items
    .map(
      (item) => `
    <item>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <description><![CDATA[${item.descriptionHtml}]]></description>
      <content:encoded><![CDATA[${item.contentHtml}]]></content:encoded>
    </item>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(env.FEED_TITLE)}</title>
    <link>${escapeXml(env.APP_BASE_URL)}</link>
    <description>${escapeXml(env.FEED_DESCRIPTION)}</description>
    <language>${escapeXml(env.FEED_LANGUAGE)}</language>
    <ttl>15</ttl>
    <lastBuildDate>${now}</lastBuildDate>${channelItems}
  </channel>
</rss>`;
}
