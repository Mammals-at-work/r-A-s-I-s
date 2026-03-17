export type QualityState = "llm_curated" | "fallback" | "low_confidence" | "rejected";

export interface SourceConfig {
  id: string;
  name: string;
  feedUrl: string;
  homepage: string;
  language: string;
  enabled: boolean;
  weight: number;
}

export interface NormalizedItem {
  sourceId: string;
  title: string;
  canonicalUrl: string;
  publishedAt: Date;
  rawSummary: string;
  rawContent: string;
  author: string | null;
  categories: string[];
}

export interface SummaryResult {
  shortTitle: string;
  summaryEs: string;
  confidence: number;
  providerName: string;
  modelName: string | null;
}

export interface ClassificationResult {
  tags: string[];
  confidence: number;
}

export interface CuratedItem {
  guid: string;
  shortTitle: string;
  summaryEs: string;
  tags: string[];
  confidence: number;
  qualityState: QualityState;
  descriptionHtml: string;
  contentHtml: string;
  providerName: string | null;
  modelName: string | null;
}

export interface FeedItemRecord {
  guid: string;
  title: string;
  link: string;
  pubDate: Date;
  descriptionHtml: string;
  contentHtml: string;
  sourceName: string;
  tags: string[];
  qualityState: QualityState;
}

export interface RefreshStats {
  processedCount: number;
  curatedCount: number;
  skippedDuplicates: number;
  failedSources: string[];
}
