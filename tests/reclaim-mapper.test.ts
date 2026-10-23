import { describe, expect, it } from "vitest";
import { toDateInputValue } from "../src/lib/datetime.js";
import { mapTaskToReclaim } from "../src/providers/reclaim/mapper.js";

describe("mapTaskToReclaim", () => {
  it("maps duration, priority, and a calendar due date", () => {
    const dueAt = "2026-10-23T17:00:00.000Z";
    const payload = mapTaskToReclaim({
      title: "Review thesis",
      priority: "P2",
      durationMinutes: 45,
      dueAt,
      sourceMessageId: "<x@y>",
      sourceSubject: "Thesis",
    });
    expect(payload.estimateMinutes).toBe(45);
    expect(payload.priority).toBe("P2");
    expect(payload.dueDate).toBe(toDateInputValue(dueAt));
    expect(payload.description).toContain("Message-ID");
    expect(payload.description).toContain("Subject: Thesis");
    expect(payload).not.toHaveProperty("timeChunksRequired");
    expect(payload).not.toHaveProperty("due");
  });

  it("maps a date-only start and drops 1.0 scheduler fields", () => {
    const payload = mapTaskToReclaim({
      title: "T",
      priority: "P1",
      durationMinutes: 60,
      earliestStart: "2026-10-19",
      minBlockMinutes: 30,
      maxBlockMinutes: 90,
      onDeck: true,
      alwaysPrivate: true,
      eventCategory: "WORK",
      timeSchemeId: "scheme-1",
    });
    expect(payload.startDate).toBe("2026-10-19");
    expect(payload.estimateMinutes).toBe(60);
    expect(payload).not.toHaveProperty("snoozeUntil");
    expect(payload).not.toHaveProperty("minChunkSize");
    expect(payload).not.toHaveProperty("maxChunkSize");
    expect(payload).not.toHaveProperty("onDeck");
    expect(payload).not.toHaveProperty("alwaysPrivate");
    expect(payload).not.toHaveProperty("eventCategory");
    expect(payload).not.toHaveProperty("timeSchemeId");
  });
});
