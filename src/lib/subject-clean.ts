/**
 * Strip common reply/forward prefixes (EN, DE, HU, etc.) for default titles.
 */
const PREFIX =
  /^(?:(?:re|fw|fwd|aw|wg|sv|vs|antw|ref|vá|továbbítás)\s*:\s*)+/i;

export function cleanSubject(subject: string | undefined | null): string {
  if (!subject) return "";
  let s = subject.trim();
  // Repeatedly strip to handle "Re: Re: Fwd: …"
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(PREFIX, "").trim();
  }
  // Collapse whitespace
  return s.replace(/\s+/g, " ").trim();
}
