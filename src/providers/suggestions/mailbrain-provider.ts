/**
 * Phase 2 stub — wired but unused until Mail Brain is configured.
 * Contract: docs/mailbrain-api.md
 */
import { httpJson } from "../../lib/http.js";
import { AppError } from "../../lib/errors.js";
import type { AnalyzeInput, SuggestionResult } from "../../models/suggestion.js";
import { getPreferences } from "../../storage/preferences.js";
import type { SuggestionProvider } from "./types.js";

export class MailBrainSuggestionProvider implements SuggestionProvider {
  readonly id = "mailbrain";

  async isConfigured(): Promise<boolean> {
    const prefs = await getPreferences();
    return Boolean(prefs.mailbrain.enabled && prefs.mailbrain.serverUrl);
  }

  async analyze(input: AnalyzeInput, signal: AbortSignal): Promise<SuggestionResult> {
    const prefs = await getPreferences();
    if (!prefs.mailbrain.enabled || !prefs.mailbrain.serverUrl) {
      throw new AppError("not_configured", "Mail Brain is not configured.");
    }

    const base = prefs.mailbrain.serverUrl.replace(/\/$/, "");
    const headers: Record<string, string> = {};
    if (prefs.mailbrain.authToken) {
      headers.Authorization = `Bearer ${prefs.mailbrain.authToken}`;
    }

    return httpJson<SuggestionResult>(`${base}/api/v1/scheduling/analyze`, {
      method: "POST",
      headers,
      signal,
      body: {
        schema_version: "1.0",
        message: {
          message_id: input.messageId,
          subject: input.subject,
          from: input.from,
          date: input.date,
          timezone: input.timezone,
          text: input.text,
        },
        locale: input.locale ?? "en",
      },
    });
  }
}
