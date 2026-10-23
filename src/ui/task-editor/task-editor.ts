import type { MessageContext } from "../../background/message-context.js";
import type { Preferences } from "../../storage/preferences.js";
import type { TaskDraft, TaskPriority } from "../../models/task.js";
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

function select(id: string): HTMLSelectElement {
  return $(id) as HTMLSelectElement;
}

async function init(): Promise<void> {
  const ctxRes = await send<CtxResponse>({ type: "GET_MESSAGE_CONTEXT" });
  const prefsRes = await send<PrefsResponse>({ type: "GET_PREFERENCES" });
  const ctx = ctxRes.context;
  const prefs = prefsRes.preferences;

  const source = $("source");
  const alert = $("alert");

  if (!ctx) {
    source.textContent = "No message context — you can still fill the form manually.";
  } else {
    source.textContent = `From email: ${ctx.cleanedSubject || ctx.subject}`;
    input("title").value = ctx.cleanedSubject || ctx.subject || "";
  }

  if (!prefs.reclaim.connected || !prefs.reclaim.apiKey) {
    alert.hidden = false;
    alert.className = "status err";
    alert.textContent = "Reclaim API key is not set. Open Settings first.";
  }

  select("priority").value = prefs.reclaim.defaultPriority || "P2";
  input("duration").value = String(prefs.reclaim.defaultDurationMinutes || 30);

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

    const durationMinutes = Number(input("duration").value) || 30;
    const dueVal = input("due").value;
    const startVal = input("start").value;

    const draft: TaskDraft = {
      title,
      priority: select("priority").value as TaskPriority,
      durationMinutes,
      dueAt: dueVal || undefined,
      earliestStart: startVal || undefined,
      notes: (document.getElementById("notes") as HTMLTextAreaElement).value.trim() || undefined,
      sourceMessageId: ctx.rfcMessageId,
      sourceSubject: ctx.subject,
    };

    const btn = $("btn-save") as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "Creating…";

    let result = (await send({
      type: "CREATE_TASK",
      messageId: ctx.rfcMessageId,
      draft,
    })) as {
      ok: boolean;
      error?: string;
      link?: string;
      duplicate?: { link?: string };
    };

    if (!result.ok && result.duplicate) {
      const force = confirm(
        "A task was already created from this email. Create another anyway?",
      );
      if (force) {
        result = (await send({
          type: "CREATE_TASK",
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
      if (result.link) {
        alert.appendChild(document.createTextNode("Created. "));
        appendLink(alert, result.link, "Open in Reclaim");
      } else {
        setText(alert, "Created.");
      }
      btn.textContent = "Done";
    } else {
      alert.className = "status err";
      setText(alert, result.error || "Failed to create task.");
      btn.disabled = false;
      btn.textContent = "Create task";
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
