/** Provider-independent Reclaim task model. */

export type TaskPriority = "P1" | "P2" | "P3" | "P4";

export interface TaskDraft {
  title: string;
  priority: TaskPriority;
  /** Estimated work duration in minutes. Sent as estimateMinutes. */
  durationMinutes: number;
  /** Deadline. ISO 8601 or YYYY-MM-DD. Sent as dueDate. */
  dueAt?: string;
  /** Earliest start. ISO 8601 or YYYY-MM-DD. Sent as startDate. */
  earliestStart?: string;
  minBlockMinutes?: number;
  maxBlockMinutes?: number;
  timeSchemeId?: string;
  notes?: string;
  alwaysPrivate?: boolean;
  /** Up Next */
  onDeck?: boolean;
  eventCategory?: "WORK" | "PERSONAL";
  sourceMessageId?: string;
  sourceSubject?: string;
}

export interface CreatedTask {
  id: string;
  link?: string;
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P1: "P1 — Critical",
  P2: "P2 — High",
  P3: "P3 — Medium",
  P4: "P4 — Low",
};
