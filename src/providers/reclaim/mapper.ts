import type { TaskDraft } from "../../models/task.js";
import { toDateInputValue } from "../../lib/datetime.js";

/** Body for POST /api/reclaim-tasks (Reclaim 2.0). */
export interface ReclaimTaskCreateRequest {
  title: string;
  description?: string;
  priority?: string;
  estimateMinutes?: number;
  /** Calendar date YYYY-MM-DD */
  dueDate?: string;
  /** Calendar date YYYY-MM-DD */
  startDate?: string;
}

function calendarDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = toDateInputValue(value);
  return date || undefined;
}

export function mapTaskToReclaim(draft: TaskDraft): ReclaimTaskCreateRequest {
  const notesParts: string[] = [];
  if (draft.notes) notesParts.push(draft.notes);
  if (draft.sourceMessageId || draft.sourceSubject) {
    const bits = [
      draft.sourceSubject ? `Subject: ${draft.sourceSubject}` : null,
      draft.sourceMessageId ? `Message-ID: ${draft.sourceMessageId}` : null,
    ].filter(Boolean);
    notesParts.push(`Source email\n${bits.join("\n")}`);
  }

  const payload: ReclaimTaskCreateRequest = {
    title: draft.title,
    priority: draft.priority,
  };

  if (Number.isFinite(draft.durationMinutes) && draft.durationMinutes > 0) {
    payload.estimateMinutes = Math.round(draft.durationMinutes);
  }

  const description = notesParts.join("\n\n");
  if (description) payload.description = description;

  const dueDate = calendarDate(draft.dueAt);
  if (dueDate) payload.dueDate = dueDate;

  const startDate = calendarDate(draft.earliestStart);
  if (startDate) payload.startDate = startDate;

  return payload;
}
