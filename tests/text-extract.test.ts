import { describe, expect, it } from "vitest";
import { cleanForAnalysis, extractPlainText, stripHtml } from "../src/lib/text-extract.js";

describe("text-extract", () => {
  it("prefers text/plain", () => {
    const text = extractPlainText({
      contentType: "multipart/alternative",
      parts: [
        { contentType: "text/plain", body: "plain body" },
        { contentType: "text/html", body: "<p>html</p>" },
      ],
    });
    expect(text).toBe("plain body");
  });

  it("strips html", () => {
    expect(stripHtml("<p>Hi<br>there</p>")).toContain("Hi");
    expect(stripHtml("<p>Hi<br>there</p>")).not.toContain("<");
  });

  it("removes quotes and signatures", () => {
    const cleaned = cleanForAnalysis(
      ["Please review before Friday.", "", "> old quoted", "--", "John Doe"].join("\n"),
    );
    expect(cleaned).toContain("Please review");
    expect(cleaned).not.toContain("old quoted");
    expect(cleaned).not.toContain("John Doe");
  });
});
