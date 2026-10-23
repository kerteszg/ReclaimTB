import type { MessageContext } from "../../background/message-context.js";
import type { Preferences } from "../../storage/preferences.js";
import type { CalendarEventDraft } from "../../models/event.js";
import {
  addMinutesIso,
  allDayExclusiveEnd,
  fromLocalInputValue,
  nowPlusMinutesLocal,
  toDateInputValue,
  toLocalInputValue,
} from "../../lib/datetime.js";
import { appendLink, clearEl, setText } from "../shared/dom.js";

interface CtxResponse {
  ok: boolean;
  context: MessageContext | null;
}

interface PrefsResponse {
  ok: boolean;
  preferences: Preferences;
}

async function send<T>(msg: unknown): Promise<T> {
  return browser.runtime.sendMessage(msg) as Promise<T>;
}

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function input(id: string): HTMLInputElement {
  return $(id) as HTMLInputElement;
}

async function init(): Promise<void> {
  const ctxRes = await send<CtxResponse>({ type: "GET_MESSAGE_CONTEXT" });
  const prefsRes = await send<PrefsResponse>({ type: "GET_PREFERENCES" });
  const ctx = ctxRes.context;
  const prefs = prefsRes.preferences;

  const source = $("source");
  const alert = $("alert");
  const calendarInfo = $("calendar-info");

  if (!ctx) {
    source.textContent = "No message context — you can still fill the form manually.";
  } else {
    source.textContent = `From email: ${ctx.cleanedSubject || ctx.subject}`;
    input("title").value = ctx.cleanedSubject || ctx.subject || "";
  }

  if (!prefs.google.connected || !prefs.google.calendarId) {
    alert.hidden = false;
    alert.className = "status err";
    alert.textContent = "Google Calendar is not connected. Open Settings first.";
  } else {
    calendarInfo.textContent = `Calendar: ${prefs.google.calendarSummary || prefs.google.calendarId}`;
  }

  input("blocking").checked = prefs.google.blockByDefault !== false;

  const startLocal = nowPlusMinutesLocal(30);
  input("start").value = startLocal;
  const endIso = addMinutesIso(fromLocalInputValue(startLocal), 60);
  input("end").value = toLocalInputValue(endIso);
  input("startDate").value = toDateInputValue(fromLocalInputValue(startLocal));

  input("start").addEventListener("change", () => {
    if (!input("allDay").checked) {
      const endIso2 = addMinutesIso(fromLocalInputValue(input("start").value), 60);
      input("end").value = toLocalInputValue(endIso2);
    }
  });

  input("allDay").addEventListener("change", () => {
    const allDay = input("allDay").checked;
    $("start-datetime-wrap").hidden = allDay;
    $("end-datetime-wrap").hidden = allDay;
    $("start-date-wrap").hidden = !allDay;
  });

  $("btn-cancel").addEventListener("click", () => window.close());

  $("btn-save").addEventListener("click", async () => {
    const title = input("title").value.trim();
    if (!title) {
      alert.hidden = false;
      alert.className = "status err";
      alert.textContent = "Title is required.";
      return;
    }
    if (!ctx?.rfcMessageId) {
      alert.hidden = false;
      alert.className = "status err";
      alert.textContent = "No source Message-ID; open an email first.";
      return;
    }

    const allDay = input("allDay").checked;
    let start: string;
    let end: string;
    if (allDay) {
      start = input("startDate").value;
      end = allDayExclusiveEnd(start);
    } else {
      start = fromLocalInputValue(input("start").value);
      end = fromLocalInputValue(input("end").value);
    }

    const draft: CalendarEventDraft = {
      title,
      location: input("location").value.trim() || undefined,
      start,
      end,
      allDay,
      blocking: input("blocking").checked,
      description: (document.getElementById("description") as HTMLTextAreaElement).value.trim() || undefined,
      visibility: (document.getElementById("visibility") as HTMLSelectElement).value as
        | "default"
        | "public"
        | "private",
      sourceMessageId: ctx.rfcMessageId,
      sourceSubject: ctx.subject,
    };

    const btn = $("btn-save") as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "Creating…";

    let result = (await send({
      type: "CREATE_EVENT",
      messageId: ctx.rfcMessageId,
      draft,
    })) as {
      ok: boolean;
      error?: string;
      htmlLink?: string;
      duplicate?: { link?: string };
    };

    if (!result.ok && result.duplicate) {
      const force = confirm(
        "An event was already created from this email. Create another anyway?",
      );
      if (force) {
        result = (await send({
          type: "CREATE_EVENT",
          messageId: ctx.rfcMessageId,
          draft,
          force: true,
        })) as typeof result;
      }
    }

    alert.hidden = false;
    if (result.ok) {
      alert.className = "status ok";
      clearEl(alert);
      if (result.htmlLink) {
        alert.appendChild(document.createTextNode("Created. "));
        appendLink(alert, result.htmlLink, "Open in Google Calendar");
      } else {
        setText(alert, "Created.");
      }
      btn.textContent = "Done";
    } else {
      alert.className = "status err";
      setText(alert, result.error || "Failed to create event.");
      btn.disabled = false;
      btn.textContent = "Create event";
    }
  });
}

init().catch((err) => {
  const alert = document.getElementById("alert");
  if (alert) {
    alert.hidden = false;
    alert.className = "status err";
    alert.textContent = String(err);
  }
});
