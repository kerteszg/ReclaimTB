import { describe, expect, it } from "vitest";
import { mapEventToGoogle } from "../src/providers/google-calendar/mapper.js";

describe("mapEventToGoogle", () => {
  it("maps blocking timed event", () => {
    const resource = mapEventToGoogle({
      title: "Meet",
      start: "2026-10-20T10:00:00.000Z",
      end: "2026-10-20T11:00:00.000Z",
      allDay: false,
      blocking: true,
      sourceMessageId: "<abc@example.com>",
    });
    expect(resource.summary).toBe("Meet");
    expect(resource.transparency).toBe("opaque");
    expect(resource.start.dateTime).toBeDefined();
    expect(resource.extendedProperties?.private?.["reclaimtb.messageId"]).toBe(
      "<abc@example.com>",
    );
  });

  it("maps all-day non-blocking", () => {
    const resource = mapEventToGoogle({
      title: "Holiday",
      start: "2026-10-20",
      end: "2026-10-21",
      allDay: true,
      blocking: false,
    });
    expect(resource.transparency).toBe("transparent");
    expect(resource.start.date).toBe("2026-10-20");
    expect(resource.end.date).toBe("2026-10-21");
  });
});
