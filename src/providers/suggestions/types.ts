import type { AnalyzeInput, SuggestionResult } from "../../models/suggestion.js";

export interface SuggestionProvider {
  readonly id: string;
  isConfigured(): Promise<boolean>;
  analyze(input: AnalyzeInput, signal: AbortSignal): Promise<SuggestionResult>;
}
