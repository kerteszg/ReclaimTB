import type { AnalyzeInput, SuggestionResult } from "../../models/suggestion.js";
import type { SuggestionProvider } from "./types.js";

export class NullSuggestionProvider implements SuggestionProvider {
  readonly id = "null";

  async isConfigured(): Promise<boolean> {
    return true;
  }

  async analyze(_input: AnalyzeInput, _signal: AbortSignal): Promise<SuggestionResult> {
    return { schema_version: "1.0", suggestions: [] };
  }
}
