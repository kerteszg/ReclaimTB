import { describe, expect, it } from "vitest";
import {
  allDayExclusiveEnd,
  chunksToMinutes,
  minutesToChunks,
  toDateInputValue,
} from "../src/lib/datetime.js";

describe("datetime", () => {
  it("converts minutes to 15-min chunks", () => {
    expect(minutesToChunks(15)).toBe(1);
    expect(minutesToChunks(30)).toBe(2);
    expect(minutesToChunks(45)).toBe(3);
    expect(minutesToChunks(1)).toBe(1);
  });

  it("converts chunks back to minutes", () => {
    expect(chunksToMinutes(2)).toBe(30);
  });

  it("computes exclusive all-day end", () => {
    expect(allDayExclusiveEnd("2026-10-20")).toBe("2026-10-21");
  });

  it("reads a calendar date from a Reclaim due timestamp", () => {
    const precise = "2026-10-25T23:59:59.999999999+01:00";
    const millis = "2026-10-25T23:59:59.999+01:00";
    expect(toDateInputValue(precise)).toBe(toDateInputValue(millis));
    expect(toDateInputValue(precise)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
