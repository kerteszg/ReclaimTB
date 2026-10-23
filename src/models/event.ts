/** Provider-independent calendar event model. */

export interface CalendarEventDraft {
  title: string;
  location?: string;
  /** ISO 8601 date-time, or YYYY-MM-DD when allDay */
  start: string;
  /** ISO 8601 date-time, or YYYY-MM-DD (exclusive) when allDay */
  end: string;
  allDay: boolean;
  /** Busy = true → Google transparency opaque */
  blocking: boolean;
  description?: string;
  visibility?: "default" | "public" | "private";
  /** Source email association */
  sourceMessageId?: string;
  sourceSubject?: string;
}

export interface CreatedCalendarEvent {
  id: string;
  htmlLink?: string;
  calendarId: string;
}

export function defaultEventEnd(startIso: string, allDay: boolean): string {
  if (allDay) {
    const d = new Date(startIso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(startIso);
  d.setMinutes(d.getMinutes() + 60);
  return d.toISOString();
}
