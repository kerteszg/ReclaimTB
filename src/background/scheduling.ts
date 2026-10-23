import type { CalendarEventDraft } from "../models/event.js";
import type { TaskDraft } from "../models/task.js";
import {
  addAssociation,
  hasCreated,
  updateAssociation,
  type Association,
} from "../storage/associations.js";
import * as google from "../providers/google-calendar/client.js";
import * as reclaim from "../providers/reclaim/client.js";
import { AppError, toAppError, userMessage } from "../lib/errors.js";

function attemptId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface CreateEventResult {
  ok: boolean;
  association: Association;
  htmlLink?: string;
  error?: string;
  duplicate?: Association;
}

export interface CreateTaskResult {
  ok: boolean;
  association: Association;
  link?: string;
  error?: string;
  duplicate?: Association;
}

export async function createEventFromDraft(
  messageId: string,
  draft: CalendarEventDraft,
  opts: { force?: boolean } = {},
): Promise<CreateEventResult> {
  const existing = await hasCreated(messageId, "event");
  if (existing && !opts.force) {
    return {
      ok: false,
      association: existing,
      duplicate: existing,
      error: "An event was already created from this email.",
    };
  }

  // Recover from lost response
  try {
    const found = await google.findEventByMessageId(messageId);
    if (found && !opts.force) {
      const assoc: Association = {
        kind: "event",
        status: "created",
        providerId: found.id,
        link: found.htmlLink,
        title: draft.title,
        createdAt: new Date().toISOString(),
        attemptId: attemptId(),
      };
      await addAssociation(messageId, assoc);
      return { ok: true, association: assoc, htmlLink: found.htmlLink, duplicate: assoc };
    }
  } catch {
    // ignore lookup failures
  }

  const id = attemptId();
  const pending: Association = {
    kind: "event",
    status: "pending",
    title: draft.title,
    createdAt: new Date().toISOString(),
    attemptId: id,
  };
  await addAssociation(messageId, pending);

  try {
    const created = await google.createEvent({
      ...draft,
      sourceMessageId: draft.sourceMessageId || messageId,
    });
    await updateAssociation(messageId, id, {
      status: "created",
      providerId: created.id,
      link: created.htmlLink,
    });
    return {
      ok: true,
      association: {
        ...pending,
        status: "created",
        providerId: created.id,
        link: created.htmlLink,
      },
      htmlLink: created.htmlLink,
    };
  } catch (err) {
    const appErr = toAppError(err);
    await updateAssociation(messageId, id, {
      status: "failed",
      error: userMessage(appErr),
    });
    return {
      ok: false,
      association: { ...pending, status: "failed", error: userMessage(appErr) },
      error: userMessage(appErr),
    };
  }
}

export async function createTaskFromDraft(
  messageId: string,
  draft: TaskDraft,
  opts: { force?: boolean } = {},
): Promise<CreateTaskResult> {
  const existing = await hasCreated(messageId, "task");
  if (existing && !opts.force) {
    return {
      ok: false,
      association: existing,
      duplicate: existing,
      error: "A task was already created from this email.",
    };
  }

  try {
    const found = await reclaim.findTaskByTitleAndDue(draft.title, draft.dueAt);
    if (found && !opts.force) {
      const assoc: Association = {
        kind: "task",
        status: "created",
        providerId: String(found.id),
        link: reclaim.reclaimTaskUrl(found),
        title: draft.title,
        createdAt: new Date().toISOString(),
        attemptId: attemptId(),
      };
      await addAssociation(messageId, assoc);
      return {
        ok: true,
        association: assoc,
        link: assoc.link,
        duplicate: assoc,
      };
    }
  } catch {
    // ignore
  }

  const id = attemptId();
  const pending: Association = {
    kind: "task",
    status: "pending",
    title: draft.title,
    createdAt: new Date().toISOString(),
    attemptId: id,
  };
  await addAssociation(messageId, pending);

  try {
    const created = await reclaim.createTask({
      ...draft,
      sourceMessageId: draft.sourceMessageId || messageId,
    });
    await updateAssociation(messageId, id, {
      status: "created",
      providerId: created.id,
      link: created.link,
    });
    return {
      ok: true,
      association: {
        ...pending,
        status: "created",
        providerId: created.id,
        link: created.link,
      },
      link: created.link,
    };
  } catch (err) {
    const appErr = toAppError(err);
    await updateAssociation(messageId, id, {
      status: "failed",
      error: userMessage(appErr),
    });
    return {
      ok: false,
      association: { ...pending, status: "failed", error: userMessage(appErr) },
      error: userMessage(appErr),
    };
  }
}

export function assertTitle(title: string): void {
  if (!title?.trim()) {
    throw new AppError("invalid_input", "Title is required.");
  }
}
