import type { SourceConfig } from "../types.js";

export const sources: SourceConfig[] = [
  {
    id: "bbc-news",
    name: "BBC News",
    feedUrl: "https://feeds.bbci.co.uk/news/rss.xml",
    homepage: "https://www.bbc.com/news",
    language: "en",
    enabled: true,
    weight: 3
  },
  {
    id: "nyt-home",
    name: "The New York Times",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    homepage: "https://www.nytimes.com",
    language: "en",
    enabled: true,
    weight: 3
  },
  {
    id: "guardian-world",
    name: "The Guardian",
    feedUrl: "https://www.theguardian.com/world/rss",
    homepage: "https://www.theguardian.com",
    language: "en",
    enabled: true,
    weight: 2
  }
];
