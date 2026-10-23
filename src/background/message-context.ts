import { cleanSubject } from "../lib/subject-clean.js";
import { cleanForAnalysis, extractPlainText, type MimePart } from "../lib/text-extract.js";

export interface MessageContext {
  tabId: number;
  /** Thunderbird internal message id */
  thunderbirdMessageId: number;
  /** RFC Message-ID header when available */
  rfcMessageId: string;
  subject: string;
  cleanedSubject: string;
  from?: string;
  date?: string;
  folderAccountId?: string;
}

const byTab = new Map<number, MessageContext>();

function headerValue(
  headers: Record<string, string[]> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  if (!key) return undefined;
  const vals = headers[key];
  return vals?.[0];
}

export async function captureDisplayedMessage(
  tab: { id?: number },
  message: {
    id: number;
    headerMessageId?: string;
    subject?: string;
    author?: string;
    date?: Date | string | number;
  },
): Promise<MessageContext | null> {
  if (tab.id == null) return null;

  let rfcMessageId = message.headerMessageId || "";
  let from = message.author;
  let date: string | undefined;
  if (message.date != null) {
    const parsed = new Date(message.date);
    if (!Number.isNaN(parsed.getTime())) date = parsed.toISOString();
  }

  try {
    const full = (await messenger.messages.getFull(message.id)) as MimePart & {
      headers?: Record<string, string[]>;
    };
    rfcMessageId =
      headerValue(full.headers, "message-id") ||
      message.headerMessageId ||
      `tb-local-${message.id}`;
    from = headerValue(full.headers, "from") || from;
    const dateHdr = headerValue(full.headers, "date");
    if (dateHdr) {
      const parsed = new Date(dateHdr);
      if (!Number.isNaN(parsed.getTime())) date = parsed.toISOString();
    }
  } catch {
    if (!rfcMessageId) rfcMessageId = `tb-local-${message.id}`;
  }

  const ctx: MessageContext = {
    tabId: tab.id,
    thunderbirdMessageId: message.id,
    rfcMessageId,
    subject: message.subject || "",
    cleanedSubject: cleanSubject(message.subject),
    from,
    date,
  };
  byTab.set(tab.id, ctx);
  return ctx;
}

export function getContextForTab(tabId: number): MessageContext | undefined {
  return byTab.get(tabId);
}

export function getAnyRecentContext(): MessageContext | undefined {
  const values = [...byTab.values()];
  return values[values.length - 1];
}

export async function getCleanedBody(thunderbirdMessageId: number): Promise<string> {
  try {
    const full = (await messenger.messages.getFull(thunderbirdMessageId)) as MimePart;
    return cleanForAnalysis(extractPlainText(full));
  } catch {
    return "";
  }
}

export function clearTab(tabId: number): void {
  byTab.delete(tabId);
}
