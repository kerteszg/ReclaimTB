/**
 * Feature flags for Reclaim 2.0 task fields.
 * Create/list use /api/reclaim-tasks. Scheduler-only 1.0 fields are unsupported.
 */

export interface ReclaimCapabilities {
  versionLabel: string;
  fields: {
    title: boolean;
    priority: boolean;
    duration: boolean;
    due: boolean;
    earliestStart: boolean;
    minBlock: boolean;
    maxBlock: boolean;
    timeScheme: boolean;
    notes: boolean;
    alwaysPrivate: boolean;
    onDeck: boolean;
    eventCategory: boolean;
  };
}

export const RECLAIM_V2_CAPABILITIES: ReclaimCapabilities = {
  versionLabel: "2.0",
  fields: {
    title: true,
    priority: true,
    duration: true,
    due: true,
    earliestStart: true,
    minBlock: false,
    maxBlock: false,
    timeScheme: false,
    notes: true,
    alwaysPrivate: false,
    onDeck: false,
    eventCategory: false,
  },
};

export function detectCapabilities(_probe?: unknown): ReclaimCapabilities {
  return RECLAIM_V2_CAPABILITIES;
}
