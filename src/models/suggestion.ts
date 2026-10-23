import type { TaskPriority } from "./task.js";

export type SuggestionType = "event" | "task";

export interface EventSuggestionFields {
  title?: string;
  start?: string;
  end?: string;
  location?: string | null;
  all_day?: boolean;
}

export interface TaskSuggestionFields {
  title?: string;
  priority?: TaskPriority;
  duration_minutes?: number;
  due_at?: string;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  confidence: number;
  fields: EventSuggestionFields | TaskSuggestionFields;
  evidence?: string;
  assumptions?: string[];
}

export interface SuggestionResult {
  schema_version: string;
  suggestions: Suggestion[];
}

export interface AnalyzeInput {
  messageId: string;
  subject: string;
  from?: string;
  date?: string;
  timezone?: string;
  text: string;
  locale?: string;
}
