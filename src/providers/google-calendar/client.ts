import { httpJson } from "../../lib/http.js";
import { AppError } from "../../lib/errors.js";
import type { CalendarEventDraft, CreatedCalendarEvent } from "../../models/event.js";
import { getPreferences, updatePreferences } from "../../storage/preferences.js";
import { getValidAccessToken, connectGoogle, disconnectGoogle } from "./oauth.js";
import { mapEventToGoogle } from "./mapper.js";

const CAL_BASE = "https://www.googleapis.com/calendar/v3";

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
  timeZone?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function listWritableCalendars(): Promise<CalendarListEntry[]> {
  const headers = await authHeaders();
  const data = await httpJson<{ items?: CalendarListEntry[] }>(
    `${CAL_BASE}/users/me/calendarList`,
    { headers },
  );
  return (data.items || []).filter(
    (c) => c.accessRole === "owner" || c.accessRole === "writer",
  );
}

export async function createEvent(
  draft: CalendarEventDraft,
): Promise<CreatedCalendarEvent> {
  const prefs = await getPreferences();
  if (!prefs.google.calendarId) {
    throw new AppError("not_configured", "No destination Google Calendar selected.");
  }

  const headers = await authHeaders();
  const body = mapEventToGoogle(draft, prefs.google.calendarTimeZone);
  const created = await httpJson<{ id: string; htmlLink?: string }>(
    `${CAL_BASE}/calendars/${encodeURIComponent(prefs.google.calendarId)}/events`,
    { method: "POST", headers, body },
  );

  return {
    id: created.id,
    htmlLink: created.htmlLink,
    calendarId: prefs.google.calendarId,
  };
}

export async function findEventByMessageId(
  messageId: string,
): Promise<{ id: string; htmlLink?: string } | null> {
  const prefs = await getPreferences();
  if (!prefs.google.calendarId) return null;
  const headers = await authHeaders();
  const q = encodeURIComponent(`reclaimtb.messageId=${messageId}`);
  const data = await httpJson<{ items?: Array<{ id: string; htmlLink?: string }> }>(
    `${CAL_BASE}/calendars/${encodeURIComponent(prefs.google.calendarId)}/events?privateExtendedProperty=${q}&maxResults=1`,
    { headers },
  );
  return data.items?.[0] ?? null;
}

export async function testGoogleConnection(): Promise<string> {
  const calendars = await listWritableCalendars();
  return `OK — ${calendars.length} writable calendar(s)`;
}

export async function connectAndMark(): Promise<void> {
  await connectGoogle();
  await updatePreferences((p) => ({
    ...p,
    google: { ...p.google, connected: true, lastError: undefined },
  }));
}

export async function disconnectAndClearCalendar(): Promise<void> {
  await disconnectGoogle();
  await updatePreferences((p) => ({
    ...p,
    google: {
      ...p.google,
      connected: false,
      calendarId: undefined,
      calendarSummary: undefined,
      calendarTimeZone: undefined,
      accountEmail: undefined,
      lastError: undefined,
    },
  }));
}

export { connectGoogle, disconnectGoogle, getRedirectUrl } from "./oauth.js";
