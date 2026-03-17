import type { AppEnv } from "../config/env.js";
import type { ArticleExtractor } from "../feeds/article-extractor.js";
import type { FeedFetcher } from "../feeds/feed-fetcher.js";
import type { LlmProvider } from "../llm/provider.js";
import type { CuratedItem, NormalizedItem, RefreshStats, SourceConfig } from "../types.js";
import { Repository } from "../db/repository.js";
import { buildContentHtml, buildDescriptionHtml, buildFallbackSummary } from "../utils/html.js";
import { dedupeBatch, isNearDuplicate } from "../utils/dedupe.js";
import { truncateText } from "../utils/text.js";

export class CurationService {
  constructor(
    private readonly env: AppEnv,
    private readonly repository: Repository,
    private readonly feedFetcher: FeedFetcher,
    private readonly articleExtractor: ArticleExtractor,
    private readonly llmProvider: LlmProvider,
    private readonly sourceConfigs: SourceConfig[]
  ) {}

  async refresh(): Promise<RefreshStats> {
    await this.repository.ensureSchema();
    await this.repository.syncSources(this.sourceConfigs);

    const jobRunId = await this.repository.startJobRun();
    const stats: RefreshStats = {
      processedCount: 0,
      curatedCount: 0,
      skippedDuplicates: 0,
      failedSources: []
    };

    try {
      const fetched: NormalizedItem[] = [];

      for (const source of this.sourceConfigs.filter((item) => item.enabled)) {
        try {
          const items = await this.feedFetcher.fetchSource(source);
          fetched.push(...items);
        } catch (error) {
          stats.failedSources.push(source.id);
          console.error(`Failed to fetch source ${source.id}`, error);
        }
      }

      const resolved = await Promise.all(fetched.map((item) => this.ensureEnoughContent(item)));
      const sourceWeights = new Map(this.sourceConfigs.map((source) => [source.id, source.weight]));
      const batch = dedupeBatch(
        resolved.sort((left, right) => {
          const weightDiff = (sourceWeights.get(right.sourceId) ?? 0) - (sourceWeights.get(left.sourceId) ?? 0);
          if (weightDiff !== 0) {
            return weightDiff;
          }

          return right.publishedAt.getTime() - left.publishedAt.getTime();
        })
      );
      stats.skippedDuplicates += batch.skipped;
      stats.processedCount = batch.unique.length;

      for (const item of batch.unique) {
        const persistedDuplicate = await this.isDuplicateFromPreviousRuns(item);
        if (persistedDuplicate) {
          stats.skippedDuplicates += 1;
          continue;
        }

        const rawRecord = await this.repository.upsertRawItem(item);
        const existingCurated = await this.repository.getCuratedItem(rawRecord.id);

        if (existingCurated && !rawRecord.changed) {
          continue;
        }

        const curated = await this.curateItem(item, this.sourceConfigs.find((source) => source.id === item.sourceId)?.name ?? item.sourceId);
        await this.repository.upsertCuratedItem(rawRecord.id, curated);
        stats.curatedCount += 1;
      }

      await this.repository.finishJobRun(jobRunId, "completed", stats);
      return stats;
    } catch (error) {
      await this.repository.finishJobRun(
        jobRunId,
        "failed",
        stats,
        error instanceof Error ? error.message : "Unknown refresh error"
      );
      throw error;
    }
  }

  private async ensureEnoughContent(item: NormalizedItem): Promise<NormalizedItem> {
    const minLength = 220;
    if (item.rawContent.length >= minLength || item.rawSummary.length >= 160) {
      return item;
    }

    try {
      const enriched = await this.articleExtractor.enrich(item.canonicalUrl);
      return {
        ...item,
        rawSummary: enriched.summary || item.rawSummary,
        rawContent: enriched.content || item.rawContent
      };
    } catch (error) {
      console.warn(`Article fallback failed for ${item.canonicalUrl}`, error);
      return item;
    }
  }

  private async isDuplicateFromPreviousRuns(item: NormalizedItem): Promise<boolean> {
    const candidates = await this.repository.findPotentialDuplicates(item.publishedAt);
    return candidates.some((candidate) => candidate.canonicalUrl !== item.canonicalUrl && isNearDuplicate(candidate, item));
  }

  private async curateItem(item: NormalizedItem, sourceName: string): Promise<CuratedItem> {
    try {
      const [summary, classification] = await Promise.all([
        this.llmProvider.summarize(item),
        this.llmProvider.classify(item)
      ]);

      const confidence = Math.min(summary.confidence, classification.confidence);
      const qualityState = confidence >= 0.55 ? "llm_curated" : "low_confidence";
      const summaryEs = truncateText(summary.summaryEs, 1_400);

      return {
        guid: item.canonicalUrl,
        shortTitle: summary.shortTitle || item.title,
        summaryEs,
        tags: classification.tags,
        confidence,
        qualityState,
        descriptionHtml: buildDescriptionHtml(summaryEs),
        contentHtml: buildContentHtml(summaryEs, sourceName, item.canonicalUrl),
        providerName: summary.providerName,
        modelName: summary.modelName
      };
    } catch (error) {
      console.warn(`LLM fallback for ${item.canonicalUrl}`, error);
      const fallbackSummary = buildFallbackSummary(item.rawContent || item.rawSummary || item.title);

      return {
        guid: item.canonicalUrl,
        shortTitle: truncateText(item.title, 120),
        summaryEs: fallbackSummary,
        tags: item.categories.slice(0, 4),
        confidence: 0.3,
        qualityState: "fallback",
        descriptionHtml: buildDescriptionHtml(fallbackSummary),
        contentHtml: buildContentHtml(fallbackSummary, sourceName, item.canonicalUrl),
        providerName: null,
        modelName: null
      };
    }
  }
}
