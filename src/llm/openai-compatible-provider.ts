import type { AppEnv } from "../config/env.js";
import type { ClassificationResult, NormalizedItem, SummaryResult } from "../types.js";
import type { LlmProvider } from "./provider.js";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = "openai-compatible";

  constructor(private readonly env: AppEnv) {}

  async summarize(item: NormalizedItem): Promise<SummaryResult> {
    const payload = await this.completeJson<{
      shortTitle: string;
      summaryEs: string;
      confidence: number;
    }>(
      [
        "Resume la noticia en espanol para un lector humano de RSS.",
        "No inventes informacion.",
        "Devuelve JSON con shortTitle, summaryEs y confidence entre 0 y 1."
      ].join(" "),
      item
    );

    return {
      shortTitle: payload.shortTitle.trim() || item.title,
      summaryEs: payload.summaryEs.trim(),
      confidence: clampConfidence(payload.confidence),
      providerName: this.name,
      modelName: this.env.LLM_MODEL
    };
  }

  async classify(item: NormalizedItem): Promise<ClassificationResult> {
    const payload = await this.completeJson<{ tags: string[]; confidence: number }>(
      [
        "Clasifica la noticia con un maximo de 4 tags cortos en espanol.",
        "Devuelve JSON con tags y confidence entre 0 y 1."
      ].join(" "),
      item
    );

    return {
      tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 4).map((tag) => String(tag).trim()).filter(Boolean) : [],
      confidence: clampConfidence(payload.confidence)
    };
  }

  private async completeJson<T>(instruction: string, item: NormalizedItem): Promise<T> {
    if (!this.env.LLM_API_KEY) {
      throw new Error("LLM_API_KEY is not configured");
    }

    const url = new URL("/chat/completions", ensureTrailingSlash(this.env.LLM_BASE_URL)).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.env.LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: this.env.LLM_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Eres un editor de noticias. Responde solo con JSON valido."
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                instruction,
                article: {
                  title: item.title,
                  url: item.canonicalUrl,
                  publishedAt: item.publishedAt.toISOString(),
                  rawSummary: item.rawSummary,
                  rawContent: item.rawContent,
                  categories: item.categories
                }
              },
              null,
              2
            )
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const body = (await response.json()) as ChatCompletionResponse;
    const rawContent = body.choices?.[0]?.message?.content;
    const text = Array.isArray(rawContent)
      ? rawContent.map((part) => part.text ?? "").join("")
      : rawContent ?? "";

    return safeJsonParse<T>(text);
  }
}

function safeJsonParse<T>(input: string): T {
  const match = input.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("LLM response did not include JSON");
  }

  return JSON.parse(match[0]) as T;
}

function ensureTrailingSlash(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}
