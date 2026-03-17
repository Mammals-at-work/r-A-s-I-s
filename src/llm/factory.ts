import type { AppEnv } from "../config/env.js";
import type { LlmProvider } from "./provider.js";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider.js";

export function createLlmProvider(env: AppEnv): LlmProvider {
  return new OpenAiCompatibleProvider(env);
}
