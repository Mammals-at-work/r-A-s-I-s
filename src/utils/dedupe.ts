import type { NormalizedItem } from "../types.js";
import { jaccardSimilarity } from "./text.js";

const DUPLICATE_SIMILARITY = 0.78;
const DUPLICATE_WINDOW_MS = 12 * 60 * 60 * 1000;

export function isNearDuplicate(left: Pick<NormalizedItem, "title" | "publishedAt">, right: Pick<NormalizedItem, "title" | "publishedAt">): boolean {
  const timeDistance = Math.abs(left.publishedAt.getTime() - right.publishedAt.getTime());
  if (timeDistance > DUPLICATE_WINDOW_MS) {
    return false;
  }

  return jaccardSimilarity(left.title, right.title) >= DUPLICATE_SIMILARITY;
}

export function dedupeBatch(items: NormalizedItem[]): { unique: NormalizedItem[]; skipped: number } {
  const unique: NormalizedItem[] = [];
  const byUrl = new Set<string>();
  let skipped = 0;

  for (const item of items) {
    if (byUrl.has(item.canonicalUrl)) {
      skipped += 1;
      continue;
    }

    const duplicate = unique.some((candidate) => isNearDuplicate(candidate, item));
    if (duplicate) {
      skipped += 1;
      continue;
    }

    byUrl.add(item.canonicalUrl);
    unique.push(item);
  }

  return { unique, skipped };
}
