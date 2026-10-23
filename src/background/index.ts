import {
  captureDisplayedMessage,
  clearTab,
  getAnyRecentContext,
  getCleanedBody,
  getContextForTab,
  type MessageContext,
} from "./message-context.js";
import { createEventFromDraft, createTaskFromDraft } from "./scheduling.js";
import type { CalendarEventDraft } from "../models/event.js";
import type { TaskDraft } from "../models/task.js";
import { getAssociations } from "../storage/associations.js";
import { getPreferences } from "../storage/preferences.js";
import { getActiveSuggestionProvider } from "../providers/suggestions/index.js";
import { userMessage } from "../lib/errors.js";

declare const messenger: typeof browser & {
  messageDisplay: {
    onMessageDisplayed: {
      addListener: (
        cb: (tab: { id?: number }, message: browser.messages.MessageHeader) => void,
      ) => void;
    };
  };
  messages: typeof browser.messages;
};

messenger.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
  await captureDisplayedMessage(tab, message);
});

browser.tabs.onRemoved.addListener((tabId) => {
  clearTab(tabId);
});

export type BgMessage =
  | { type: "GET_MESSAGE_CONTEXT"; tabId?: number }
  | { type: "GET_ASSOCIATIONS"; messageId: string }
  | { type: "GET_PREFERENCES" }
  | { type: "CREATE_EVENT"; messageId: string; draft: CalendarEventDraft; force?: boolean }
  | { type: "CREATE_TASK"; messageId: string; draft: TaskDraft; force?: boolean }
  | { type: "ANALYZE_MESSAGE"; tabId?: number }
  | { type: "OPEN_EDITOR"; editor: "event" | "task"; suggestionId?: string }
  | { type: "NOTIFY"; title: string; message: string };

async function resolveContext(tabId?: number): Promise<MessageContext | undefined> {
  if (tabId != null) {
    return getContextForTab(tabId) ?? getAnyRecentContext();
  }
  return getAnyRecentContext();
}

browser.runtime.onMessage.addListener((message: BgMessage, sender) => {
  return handleMessage(message, sender);
});

async function handleMessage(
  message: BgMessage,
  sender: browser.runtime.MessageSender,
): Promise<unknown> {
  try {
    switch (message.type) {
      case "GET_MESSAGE_CONTEXT": {
        const tabId = message.tabId ?? sender.tab?.id;
        const ctx = await resolveContext(tabId);
        return { ok: true, context: ctx ?? null };
      }
      case "GET_ASSOCIATIONS": {
        const list = await getAssociations(message.messageId);
        return { ok: true, associations: list };
      }
      case "GET_PREFERENCES": {
        const prefs = await getPreferences();
        return { ok: true, preferences: prefs };
      }
      case "CREATE_EVENT": {
        const result = await createEventFromDraft(
          message.messageId,
          message.draft,
          { force: message.force },
        );
        if (result.ok) {
          try {
            await browser.notifications.create({
              type: "basic",
              title: "Event created",
              message: message.draft.title || "Google Calendar event created.",
            });
          } catch {
            /* notifications optional */
          }
        }
        return result;
      }
      case "CREATE_TASK": {
        const result = await createTaskFromDraft(message.messageId, message.draft, {
          force: message.force,
        });
        if (result.ok) {
          try {
            await browser.notifications.create({
              type: "basic",
              title: "Task created",
              message: message.draft.title || "Reclaim task created.",
            });
          } catch {
            /* notifications optional */
          }
        }
        return result;
      }
      case "ANALYZE_MESSAGE": {
        const ctx = await resolveContext(message.tabId ?? sender.tab?.id);
        if (!ctx) return { ok: true, result: { schema_version: "1.0", suggestions: [] } };
        const provider = await getActiveSuggestionProvider();
        const text = await getCleanedBody(ctx.thunderbirdMessageId);
        const controller = new AbortController();
        const result = await provider.analyze(
          {
            messageId: ctx.rfcMessageId,
            subject: ctx.subject,
            from: ctx.from,
            date: ctx.date,
            text,
          },
          controller.signal,
        );
        return { ok: true, result };
      }
      case "OPEN_EDITOR": {
        const path =
          message.editor === "event"
            ? "ui/event-editor/event-editor.html"
            : "ui/task-editor/task-editor.html";
        const url = browser.runtime.getURL(path);
        await browser.tabs.create({ url });
        return { ok: true };
      }
      case "NOTIFY": {
        try {
          await browser.notifications.create({
            type: "basic",
            title: message.title,
            message: message.message,
          });
        } catch {
          /* notifications optional */
        }
        return { ok: true };
      }
      default:
        return { ok: false, error: "Unknown message type" };
    }
  } catch (err) {
    return { ok: false, error: userMessage(err) };
  }
}
