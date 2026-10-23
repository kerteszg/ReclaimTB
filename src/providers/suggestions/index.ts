import { getPreferences } from "../../storage/preferences.js";
import type { SuggestionProvider } from "./types.js";
import { NullSuggestionProvider } from "./null-provider.js";
import { MailBrainSuggestionProvider } from "./mailbrain-provider.js";

const nullProvider = new NullSuggestionProvider();
const mailbrainProvider = new MailBrainSuggestionProvider();

export async function getActiveSuggestionProvider(): Promise<SuggestionProvider> {
  const prefs = await getPreferences();
  if (prefs.mailbrain.enabled && prefs.mailbrain.serverUrl) {
    return mailbrainProvider;
  }
  return nullProvider;
}

export type { SuggestionProvider } from "./types.js";
export { NullSuggestionProvider } from "./null-provider.js";
export { MailBrainSuggestionProvider } from "./mailbrain-provider.js";
