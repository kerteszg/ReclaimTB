/**
 * Extract plain text from a Thunderbird messages.getFull() style payload,
 * prefer text/plain, strip quotes and signatures for analysis.
 */

export interface MimePart {
  contentType?: string;
  body?: string;
  parts?: MimePart[];
  name?: string;
}

export function extractPlainText(full: MimePart | null | undefined): string {
  if (!full) return "";
  const plain = findPart(full, "text/plain");
  if (plain?.body) return plain.body;
  const html = findPart(full, "text/html");
  if (html?.body) return stripHtml(html.body);
  if (full.body) return full.body;
  return "";
}

function findPart(part: MimePart, type: string): MimePart | null {
  const ct = (part.contentType || "").toLowerCase();
  if (ct.startsWith(type)) return part;
  for (const child of part.parts || []) {
    const found = findPart(child, type);
    if (found) return found;
  }
  return null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Remove quoted reply chains and common signature blocks. */
export function cleanForAnalysis(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^--\s*$/.test(line)) break; // signature delimiter
    if (/^_{5,}$/.test(line.trim())) break;
    if (/^-{5,}.*original message.*-{5,}/i.test(line)) break;
    if (/^from:\s.+/i.test(line) && out.length > 0) {
      // likely forwarded header block — stop if previous was blank
      const prev = out[out.length - 1];
      if (prev === "") break;
    }
    if (/^>/.test(line)) continue;
    if (/^on .+ wrote:$/i.test(line.trim())) break;
    if (/^\d{4}[.-]\d{2}[.-]\d{2}.+wrote:$/i.test(line.trim())) break;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
