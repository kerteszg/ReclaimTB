import type { CalendarEventDraft } from "../../models/event.js";

export interface GoogleEventResource {
  summary: string;
  location?: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  transparency?: "opaque" | "transparent";
  visibility?: "default" | "public" | "private";
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export function mapEventToGoogle(
  draft: CalendarEventDraft,
  timeZone?: string,
): GoogleEventResource {
  const descriptionParts: string[] = [];
  if (draft.description) descriptionParts.push(draft.description);
  if (draft.sourceMessageId || draft.sourceSubject) {
    const bits = [
      draft.sourceSubject ? `Subject: ${draft.sourceSubject}` : null,
      draft.sourceMessageId ? `Message-ID: ${draft.sourceMessageId}` : null,
    ].filter(Boolean);
    descriptionParts.push(`---\nSource email\n${bits.join("\n")}`);
  }

  const resource: GoogleEventResource = {
    summary: draft.title,
    transparency: draft.blocking ? "opaque" : "transparent",
    start: {},
    end: {},
  };

  if (draft.location) resource.location = draft.location;
  if (descriptionParts.length) resource.description = descriptionParts.join("\n\n");
  if (draft.visibility) resource.visibility = draft.visibility;

  if (draft.allDay) {
    resource.start.date = draft.start.slice(0, 10);
    resource.end.date = draft.end.slice(0, 10);
  } else {
    resource.start.dateTime = draft.start;
    resource.end.dateTime = draft.end;
    if (timeZone) {
      resource.start.timeZone = timeZone;
      resource.end.timeZone = timeZone;
    }
  }

  if (draft.sourceMessageId) {
    resource.extendedProperties = {
      private: {
        "reclaimtb.messageId": draft.sourceMessageId,
      },
    };
  }

  return resource;
}
