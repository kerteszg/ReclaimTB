import {
  getPreferences,
  setPreferences,
  type Preferences,
} from "../../storage/preferences.js";
import type { TaskPriority } from "../../models/task.js";
import * as google from "../../providers/google-calendar/client.js";
import * as reclaim from "../../providers/reclaim/client.js";
import { userMessage } from "../../lib/errors.js";

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function input(id: string): HTMLInputElement {
  return $(id) as HTMLInputElement;
}

function select(id: string): HTMLSelectElement {
  return $(id) as HTMLSelectElement;
}

function showErr(id: string, msg: string | null): void {
  const el = $(id);
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

async function loadForm(prefs: Preferences): Promise<void> {
  input("googleClientId").value = prefs.google.clientId || "";
  input("googleClientSecret").value = prefs.google.clientSecret || "";
  input("blockByDefault").checked = prefs.google.blockByDefault !== false;
  $("googleStatus").textContent = prefs.google.connected
    ? `Connected${prefs.google.calendarSummary ? ` — ${prefs.google.calendarSummary}` : ""}`
    : "Not connected";
  showErr("googleError", prefs.google.lastError || null);

  input("reclaimApiKey").value = prefs.reclaim.apiKey || "";
  select("defaultPriority").value = prefs.reclaim.defaultPriority || "P2";
  input("defaultDuration").value = String(prefs.reclaim.defaultDurationMinutes || 30);
  $("reclaimStatus").textContent = prefs.reclaim.connected ? "API key saved" : "Not connected";
  showErr("reclaimError", prefs.reclaim.lastError || null);

  input("mbEnabled").checked = prefs.mailbrain.enabled;
  input("mbUrl").value = prefs.mailbrain.serverUrl || "";
  input("mbToken").value = prefs.mailbrain.authToken || "";
  input("mbAnalyzeOnOpen").checked = prefs.mailbrain.analyzeOnOpen;
  input("mbHighlight").checked = prefs.mailbrain.highlightSuggestions;

  try {
    const redirect = await google.getRedirectUrl();
    $("googleRedirect").textContent = `Redirect URI (register in Google Cloud): ${redirect}`;
  } catch {
    $("googleRedirect").textContent = "";
  }

  await refreshCalendarSelect(prefs);
}

async function refreshCalendarSelect(prefs: Preferences): Promise<void> {
  const sel = select("calendarSelect");
  sel.innerHTML = "";
  if (!prefs.google.connected) {
    sel.disabled = true;
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Connect Google first";
    sel.appendChild(opt);
    return;
  }
  try {
    const calendars = await google.listWritableCalendars();
    sel.disabled = false;
    for (const c of calendars) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.summary}${c.primary ? " (primary)" : ""}`;
      if (c.id === prefs.google.calendarId) opt.selected = true;
      sel.appendChild(opt);
    }
    if (!prefs.google.calendarId && calendars.length) {
      sel.value = calendars.find((c) => c.primary)?.id || calendars[0].id;
    }
  } catch (err) {
    sel.disabled = true;
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Failed to load calendars";
    sel.appendChild(opt);
    showErr("googleError", userMessage(err));
  }
}

async function collectAndSave(): Promise<Preferences> {
  const current = await getPreferences();
  const next: Preferences = {
    ...current,
    google: {
      ...current.google,
      clientId: input("googleClientId").value.trim(),
      clientSecret: input("googleClientSecret").value.trim(),
      blockByDefault: input("blockByDefault").checked,
      calendarId: select("calendarSelect").value || current.google.calendarId,
    },
    reclaim: {
      ...current.reclaim,
      apiKey: input("reclaimApiKey").value.trim(),
      connected: Boolean(input("reclaimApiKey").value.trim()),
      defaultPriority: select("defaultPriority").value as TaskPriority,
      defaultDurationMinutes: Number(input("defaultDuration").value) || 30,
    },
    mailbrain: {
      ...current.mailbrain,
      enabled: input("mbEnabled").checked,
      serverUrl: input("mbUrl").value.trim(),
      authToken: input("mbToken").value.trim(),
      analyzeOnOpen: input("mbAnalyzeOnOpen").checked,
      highlightSuggestions: input("mbHighlight").checked,
    },
  };

  // Capture calendar summary/timezone if selected
  if (next.google.calendarId && next.google.connected) {
    try {
      const calendars = await google.listWritableCalendars();
      const chosen = calendars.find((c) => c.id === next.google.calendarId);
      if (chosen) {
        next.google.calendarSummary = chosen.summary;
        next.google.calendarTimeZone = chosen.timeZone;
      }
    } catch {
      /* keep previous */
    }
  }

  await setPreferences(next);
  return next;
}

async function init(): Promise<void> {
  let prefs = await getPreferences();
  await loadForm(prefs);

  $("saveAll").addEventListener("click", async () => {
    prefs = await collectAndSave();
    $("saveMsg").textContent = "Settings saved.";
    await loadForm(prefs);
  });

  $("mbSave").addEventListener("click", async () => {
    prefs = await collectAndSave();
    $("saveMsg").textContent = "Mail Brain settings saved.";
  });

  $("reclaimSave").addEventListener("click", async () => {
    prefs = await collectAndSave();
    $("reclaimStatus").textContent = prefs.reclaim.apiKey ? "API key saved" : "Not connected";
    showErr("reclaimError", null);
    $("saveMsg").textContent = "Reclaim settings saved.";
  });

  $("reclaimTest").addEventListener("click", async () => {
    await collectAndSave();
    try {
      const msg = await reclaim.testReclaimConnection();
      $("reclaimStatus").textContent = msg;
      showErr("reclaimError", null);
      prefs = await getPreferences();
      prefs.reclaim.connected = true;
      prefs.reclaim.lastError = undefined;
      await setPreferences(prefs);
    } catch (err) {
      const msg = userMessage(err);
      showErr("reclaimError", msg);
      prefs = await getPreferences();
      prefs.reclaim.lastError = msg;
      await setPreferences(prefs);
    }
  });

  $("reclaimDisconnect").addEventListener("click", async () => {
    await reclaim.disconnectReclaim();
    input("reclaimApiKey").value = "";
    prefs = await getPreferences();
    await loadForm(prefs);
  });

  $("googleConnect").addEventListener("click", async () => {
    await collectAndSave();
    try {
      await google.connectAndMark();
      prefs = await getPreferences();
      await refreshCalendarSelect(prefs);
      // auto-pick and save calendar if none
      if (!prefs.google.calendarId && select("calendarSelect").value) {
        prefs.google.calendarId = select("calendarSelect").value;
        const calendars = await google.listWritableCalendars();
        const chosen = calendars.find((c) => c.id === prefs.google.calendarId);
        prefs.google.calendarSummary = chosen?.summary;
        prefs.google.calendarTimeZone = chosen?.timeZone;
        await setPreferences(prefs);
      }
      prefs = await getPreferences();
      await loadForm(prefs);
      showErr("googleError", null);
    } catch (err) {
      const msg = userMessage(err);
      showErr("googleError", msg);
      prefs = await getPreferences();
      prefs.google.lastError = msg;
      await setPreferences(prefs);
    }
  });

  $("googleTest").addEventListener("click", async () => {
    try {
      const msg = await google.testGoogleConnection();
      $("googleStatus").textContent = msg;
      showErr("googleError", null);
    } catch (err) {
      showErr("googleError", userMessage(err));
    }
  });

  $("googleDisconnect").addEventListener("click", async () => {
    await google.disconnectAndClearCalendar();
    prefs = await getPreferences();
    await loadForm(prefs);
  });

  select("calendarSelect").addEventListener("change", async () => {
    prefs = await collectAndSave();
    $("saveMsg").textContent = "Destination calendar updated.";
    await loadForm(prefs);
  });
}

init().catch((err) => {
  showErr("googleError", String(err));
});
