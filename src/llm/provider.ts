import type { ClassificationResult, NormalizedItem, SummaryResult } from "../types.js";

export interface LlmProvider {
  readonly name: string;
  summarize(item: NormalizedItem): Promise<SummaryResult>;
  classify(item: NormalizedItem): Promise<ClassificationResult>;
}
