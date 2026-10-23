import type { TaskPriority } from "../models/task.js";

export const PREFERENCES_SCHEMA_VERSION = 1;

export interface Preferences {
  schemaVersion: number;

  google: {
    clientId: string;
    clientSecret: string;
    connected: boolean;
    accountEmail?: string;
    calendarId?: string;
    calendarSummary?: string;
    calendarTimeZone?: string;
    blockByDefault: boolean;
    lastError?: string;
  };

  reclaim: {
    apiKey: string;
    connected: boolean;
    defaultPriority: TaskPriority;
    defaultDurationMinutes: number;
    lastError?: string;
  };

  mailbrain: {
    enabled: boolean;
    serverUrl: string;
    authToken: string;
    analyzeOnOpen: boolean;
    highlightSuggestions: boolean;
    lastError?: string;
  };
}

export const DEFAULT_PREFERENCES: Preferences = {
  schemaVersion: PREFERENCES_SCHEMA_VERSION,
  google: {
    clientId: "",
    clientSecret: "",
    connected: false,
    blockByDefault: true,
  },
  reclaim: {
    apiKey: "",
    connected: false,
    defaultPriority: "P2",
    defaultDurationMinutes: 30,
  },
  mailbrain: {
    enabled: false,
    serverUrl: "",
    authToken: "",
    analyzeOnOpen: false,
    highlightSuggestions: true,
  },
};

const STORAGE_KEY = "preferences";

function migrate(raw: Partial<Preferences> | undefined): Preferences {
  const base = structuredClone(DEFAULT_PREFERENCES);
  if (!raw) return base;
  return {
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    google: { ...base.google, ...raw.google },
    reclaim: { ...base.reclaim, ...raw.reclaim },
    mailbrain: { ...base.mailbrain, ...raw.mailbrain },
  };
}

export async function getPreferences(): Promise<Preferences> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return migrate(result[STORAGE_KEY] as Partial<Preferences> | undefined);
}

export async function setPreferences(prefs: Preferences): Promise<void> {
  prefs.schemaVersion = PREFERENCES_SCHEMA_VERSION;
  await browser.storage.local.set({ [STORAGE_KEY]: prefs });
}

export async function updatePreferences(
  patch: (current: Preferences) => Preferences,
): Promise<Preferences> {
  const current = await getPreferences();
  const next = patch(current);
  await setPreferences(next);
  return next;
}
