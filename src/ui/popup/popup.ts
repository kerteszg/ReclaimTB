import type { MessageContext } from "../../background/message-context.js";
import type { Association } from "../../storage/associations.js";
import { appendLink, clearEl, setText } from "../shared/dom.js";

interface CtxResponse {
  ok: boolean;
  context: MessageContext | null;
  error?: string;
}

interface AssocResponse {
  ok: boolean;
  associations: Association[];
}

async function send<T>(msg: unknown): Promise<T> {
  return browser.runtime.sendMessage(msg) as Promise<T>;
}

async function init(): Promise<void> {
  const ctxEl = document.getElementById("context")!;
  const statusEl = document.getElementById("status")!;
  const btnEvent = document.getElementById("btn-event") as HTMLButtonElement;
  const btnTask = document.getElementById("btn-task") as HTMLButtonElement;
  const btnSettings = document.getElementById("btn-settings") as HTMLButtonElement;

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const res = await send<CtxResponse>({ type: "GET_MESSAGE_CONTEXT", tabId: tab?.id });
  const ctx = res.context;

  if (!ctx) {
    setText(ctxEl, "Open an email in the message pane first.");
    btnEvent.disabled = true;
    btnTask.disabled = true;
  } else {
    clearEl(ctxEl);
    const strong = document.createElement("strong");
    strong.textContent = ctx.cleanedSubject || ctx.subject || "(no subject)";
    ctxEl.appendChild(strong);
    const assocRes = await send<AssocResponse>({
      type: "GET_ASSOCIATIONS",
      messageId: ctx.rfcMessageId,
    });
    const created = (assocRes.associations || []).filter((a) => a.status === "created");
    if (created.length) {
      statusEl.hidden = false;
      statusEl.className = "status warn";
      clearEl(statusEl);
      created.forEach((a, i) => {
        if (i > 0) statusEl.appendChild(document.createElement("br"));
        statusEl.appendChild(document.createTextNode("Already created — "));
        if (a.link) {
          appendLink(statusEl, a.link, a.kind);
        } else {
          statusEl.appendChild(document.createTextNode(a.kind));
        }
      });
    }
  }

  btnEvent.addEventListener("click", async () => {
    await send({ type: "OPEN_EDITOR", editor: "event" });
    window.close();
  });

  btnTask.addEventListener("click", async () => {
    await send({ type: "OPEN_EDITOR", editor: "task" });
    window.close();
  });

  btnSettings.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
}

init().catch((err) => {
  const ctxEl = document.getElementById("context");
  if (ctxEl) ctxEl.textContent = String(err);
});
