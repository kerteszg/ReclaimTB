import { describe, expect, it } from "vitest";
import { cleanSubject } from "../src/lib/subject-clean.js";

describe("cleanSubject", () => {
  it("strips Re: and Fwd:", () => {
    expect(cleanSubject("Re: Hello")).toBe("Hello");
    expect(cleanSubject("Fwd: Hello")).toBe("Hello");
    expect(cleanSubject("FW: Hello")).toBe("Hello");
  });

  it("strips repeated prefixes", () => {
    expect(cleanSubject("Re: Re: Fwd: Thesis review")).toBe("Thesis review");
  });

  it("strips localized prefixes", () => {
    expect(cleanSubject("AW: Termin")).toBe("Termin");
    expect(cleanSubject("Vá: Találkozó")).toBe("Találkozó");
  });

  it("handles empty", () => {
    expect(cleanSubject("")).toBe("");
    expect(cleanSubject(null)).toBe("");
  });
});
