import crypto from "node:crypto";

import type { DbClient } from "./database.js";
import type { CuratedItem, FeedItemRecord, NormalizedItem, RefreshStats, SourceConfig } from "../types.js";
import { normalizeTitle } from "../utils/text.js";

type RawItemRow = {
  id: number;
  content_hash: string;
};

type SimilarCandidateRow = {
  canonical_url: string;
  title: string;
  published_at: Date;
};

type FeedRow = {
  guid: string;
  short_title: string;
  canonical_url: string;
  published_at: Date;
  description_html: string;
  content_html: string;
  source_name: string;
  tags: string[];
  quality_state: FeedItemRecord["qualityState"];
};

export class Repository {
  constructor(private readonly db: DbClient) {}

  async ensureSchema(): Promise<void> {
    const statements = [
      `
        CREATE TABLE IF NOT EXISTS sources (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          feed_url TEXT NOT NULL,
          homepage TEXT NOT NULL,
          language TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          weight INTEGER NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS raw_items (
          id BIGSERIAL PRIMARY KEY,
          source_id TEXT NOT NULL REFERENCES sources(id),
          title TEXT NOT NULL,
          normalized_title TEXT NOT NULL,
          canonical_url TEXT NOT NULL UNIQUE,
          published_at TIMESTAMPTZ NOT NULL,
          raw_summary TEXT NOT NULL,
          raw_content TEXT NOT NULL,
          author TEXT,
          categories JSONB NOT NULL DEFAULT '[]'::jsonb,
          content_hash TEXT NOT NULL,
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS curated_items (
          id BIGSERIAL PRIMARY KEY,
          raw_item_id BIGINT NOT NULL UNIQUE REFERENCES raw_items(id) ON DELETE CASCADE,
          guid TEXT NOT NULL UNIQUE,
          short_title TEXT NOT NULL,
          summary_es TEXT NOT NULL,
          tags JSONB NOT NULL DEFAULT '[]'::jsonb,
          confidence DOUBLE PRECISION NOT NULL,
          quality_state TEXT NOT NULL,
          description_html TEXT NOT NULL,
          content_html TEXT NOT NULL,
          provider_name TEXT,
          model_name TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS job_runs (
          id BIGSERIAL PRIMARY KEY,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          finished_at TIMESTAMPTZ,
          status TEXT NOT NULL,
          processed_count INTEGER NOT NULL DEFAULT 0,
          curated_count INTEGER NOT NULL DEFAULT 0,
          skipped_duplicates INTEGER NOT NULL DEFAULT 0,
          failed_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
          error_message TEXT
        )
      `
    ];

    for (const statement of statements) {
      await this.db.query(statement);
    }
  }

  async syncSources(sources: SourceConfig[]): Promise<void> {
    for (const source of sources) {
      await this.db.query(
        `
          INSERT INTO sources (id, name, feed_url, homepage, language, enabled, weight, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name,
              feed_url = EXCLUDED.feed_url,
              homepage = EXCLUDED.homepage,
              language = EXCLUDED.language,
              enabled = EXCLUDED.enabled,
              weight = EXCLUDED.weight,
              updated_at = NOW()
        `,
        [source.id, source.name, source.feedUrl, source.homepage, source.language, source.enabled, source.weight]
      );
    }
  }

  async startJobRun(): Promise<number> {
    const result = await this.db.query<{ id: number }>(
      `INSERT INTO job_runs (status) VALUES ('running') RETURNING id`
    );
    return result.rows[0].id;
  }

  async finishJobRun(jobRunId: number, status: "completed" | "failed", stats: RefreshStats, errorMessage?: string): Promise<void> {
    await this.db.query(
      `
        UPDATE job_runs
        SET finished_at = NOW(),
            status = $2,
            processed_count = $3,
            curated_count = $4,
            skipped_duplicates = $5,
            failed_sources = $6::jsonb,
            error_message = $7
        WHERE id = $1
      `,
      [jobRunId, status, stats.processedCount, stats.curatedCount, stats.skippedDuplicates, JSON.stringify(stats.failedSources), errorMessage ?? null]
    );
  }

  async findPotentialDuplicates(publishedAt: Date): Promise<Array<Pick<NormalizedItem, "canonicalUrl" | "title" | "publishedAt">>> {
    const result = await this.db.query<SimilarCandidateRow>(
      `
        SELECT canonical_url, title, published_at
        FROM raw_items
        WHERE published_at BETWEEN $1::timestamptz - INTERVAL '12 hours' AND $1::timestamptz + INTERVAL '12 hours'
        ORDER BY published_at DESC
        LIMIT 100
      `,
      [publishedAt.toISOString()]
    );

    return result.rows.map((row) => ({
      canonicalUrl: row.canonical_url,
      title: row.title,
      publishedAt: new Date(row.published_at)
    }));
  }

  async upsertRawItem(item: NormalizedItem): Promise<{ id: number; changed: boolean }> {
    const contentHash = hashItem(item);
    const existing = await this.db.query<RawItemRow>(
      `SELECT id, content_hash FROM raw_items WHERE canonical_url = $1`,
      [item.canonicalUrl]
    );

    if (!existing.rows.length) {
      const inserted = await this.db.query<{ id: number }>(
        `
          INSERT INTO raw_items (
            source_id, title, normalized_title, canonical_url, published_at, raw_summary, raw_content, author, categories, content_hash, last_seen_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, NOW())
          RETURNING id
        `,
        [
          item.sourceId,
          item.title,
          normalizeTitle(item.title),
          item.canonicalUrl,
          item.publishedAt.toISOString(),
          item.rawSummary,
          item.rawContent,
          item.author,
          JSON.stringify(item.categories),
          contentHash
        ]
      );

      return { id: inserted.rows[0].id, changed: true };
    }

    const changed = existing.rows[0].content_hash !== contentHash;

    await this.db.query(
      `
        UPDATE raw_items
        SET source_id = $2,
            title = $3,
            normalized_title = $4,
            published_at = $5,
            raw_summary = $6,
            raw_content = $7,
            author = $8,
            categories = $9::jsonb,
            content_hash = $10,
            last_seen_at = NOW()
        WHERE canonical_url = $1
      `,
      [
        item.canonicalUrl,
        item.sourceId,
        item.title,
        normalizeTitle(item.title),
        item.publishedAt.toISOString(),
        item.rawSummary,
        item.rawContent,
        item.author,
        JSON.stringify(item.categories),
        contentHash
      ]
    );

    return { id: existing.rows[0].id, changed };
  }

  async getCuratedItem(rawItemId: number): Promise<{ id: number } | null> {
    const result = await this.db.query<{ id: number }>(
      `SELECT id FROM curated_items WHERE raw_item_id = $1`,
      [rawItemId]
    );
    return result.rows[0] ?? null;
  }

  async upsertCuratedItem(rawItemId: number, item: CuratedItem): Promise<void> {
    await this.db.query(
      `
        INSERT INTO curated_items (
          raw_item_id, guid, short_title, summary_es, tags, confidence, quality_state, description_html, content_html, provider_name, model_name, updated_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (raw_item_id) DO UPDATE
        SET guid = EXCLUDED.guid,
            short_title = EXCLUDED.short_title,
            summary_es = EXCLUDED.summary_es,
            tags = EXCLUDED.tags,
            confidence = EXCLUDED.confidence,
            quality_state = EXCLUDED.quality_state,
            description_html = EXCLUDED.description_html,
            content_html = EXCLUDED.content_html,
            provider_name = EXCLUDED.provider_name,
            model_name = EXCLUDED.model_name,
            updated_at = NOW()
      `,
      [
        rawItemId,
        item.guid,
        item.shortTitle,
        item.summaryEs,
        JSON.stringify(item.tags),
        item.confidence,
        item.qualityState,
        item.descriptionHtml,
        item.contentHtml,
        item.providerName,
        item.modelName
      ]
    );
  }

  async getFeedItems(limit: number): Promise<FeedItemRecord[]> {
    const result = await this.db.query<FeedRow>(
      `
        SELECT
          curated_items.guid,
          curated_items.short_title,
          raw_items.canonical_url,
          raw_items.published_at,
          curated_items.description_html,
          curated_items.content_html,
          sources.name AS source_name,
          curated_items.tags,
          curated_items.quality_state
        FROM curated_items
        INNER JOIN raw_items ON raw_items.id = curated_items.raw_item_id
        INNER JOIN sources ON sources.id = raw_items.source_id
        WHERE curated_items.quality_state <> 'rejected'
        ORDER BY raw_items.published_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows.map((row) => ({
      guid: row.guid,
      title: row.short_title,
      link: row.canonical_url,
      pubDate: new Date(row.published_at),
      descriptionHtml: row.description_html,
      contentHtml: row.content_html,
      sourceName: row.source_name,
      tags: Array.isArray(row.tags) ? row.tags : [],
      qualityState: row.quality_state
    }));
  }

  async countRows(tableName: "raw_items" | "curated_items"): Promise<number> {
    const result = await this.db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${tableName}`);
    return Number(result.rows[0].count);
  }
}

function hashItem(item: NormalizedItem): string {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title: item.title,
        rawSummary: item.rawSummary,
        rawContent: item.rawContent,
        categories: item.categories,
        author: item.author
      })
    )
    .digest("hex");
}
