import { httpJson } from "../../lib/http.js";
import { toDateInputValue } from "../../lib/datetime.js";
import { AppError } from "../../lib/errors.js";
import type { TaskDraft, CreatedTask } from "../../models/task.js";
import { getPreferences, updatePreferences } from "../../storage/preferences.js";
import { mapTaskToReclaim } from "./mapper.js";
import { detectCapabilities, type ReclaimCapabilities } from "./capabilities.js";

const API = "https://api.app.reclaim.ai";

export interface ReclaimTaskResponse {
  id: number | string;
  title?: string;
  description?: string;
  due?: string;
  dueDate?: string;
  priority?: string;
  completed?: boolean;
  estimateMinutes?: number;
  link?: unknown;
  [key: string]: unknown;
}

interface ReclaimTaskPage {
  items?: ReclaimTaskResponse[];
  tasks?: ReclaimTaskResponse[];
  hasNextPage?: boolean;
  last?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const prefs = await getPreferences();
  if (!prefs.reclaim.apiKey) {
    throw new AppError("not_configured", "Reclaim API key is not set.");
  }
  return {
    Authorization: `Bearer ${prefs.reclaim.apiKey}`,
  };
}

function readUrl(link: unknown): string | undefined {
  if (typeof link === "string" && link.trim()) return link;
  if (link && typeof link === "object" && "url" in link) {
    const url = (link as { url?: unknown }).url;
    if (typeof url === "string" && url.trim()) return url;
  }
  return undefined;
}

/** List/create ids look like `RECLAIM:213961`. GET and DELETE want the numeric suffix. */
export function reclaimTaskPathId(id: string): string {
  const match = id.trim().match(/^RECLAIM:(\d+)$/i);
  return match ? match[1] : id.trim();
}

export function reclaimTaskUrl(task: {
  id?: number | string;
  link?: unknown;
}): string | undefined {
  return readUrl(task.link);
}

function taskDueDate(task: ReclaimTaskResponse): string {
  const raw = task.due ?? task.dueDate;
  if (typeof raw !== "string" || !raw) return "";
  return toDateInputValue(raw);
}

export async function createTask(draft: TaskDraft): Promise<CreatedTask> {
  const headers = await authHeaders();
  const body = mapTaskToReclaim(draft);
  const created = await httpJson<ReclaimTaskResponse>(`${API}/api/reclaim-tasks`, {
    method: "POST",
    headers,
    body,
  });
  const id = String(created.id);
  return {
    id,
    link: reclaimTaskUrl(created),
  };
}

export async function getTask(id: string): Promise<ReclaimTaskResponse> {
  const headers = await authHeaders();
  const pathId = reclaimTaskPathId(id);
  return httpJson(`${API}/api/reclaim-tasks/${encodeURIComponent(pathId)}`, { headers });
}

/** Open (not completed) tasks from the Reclaim 2.0 list, following page cursors. */
export async function listOpenTasks(titleQuery?: string): Promise<ReclaimTaskResponse[]> {
  const headers = await authHeaders();
  const tasks: ReclaimTaskResponse[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      completed: "false",
      count: "100",
    });
    if (titleQuery) params.set("query", titleQuery);
    if (after) params.set("after", after);

    const data = await httpJson<ReclaimTaskPage | ReclaimTaskResponse[]>(
      `${API}/api/reclaim-tasks/page?${params}`,
      { headers },
    );

    if (Array.isArray(data)) {
      return data.filter((task) => task.completed !== true);
    }

    const items = data.items ?? data.tasks ?? [];
    tasks.push(...items.filter((task) => task.completed !== true));

    if (!data.hasNextPage || !data.last || seenCursors.has(data.last)) break;
    seenCursors.add(data.last);
    after = data.last;
  }

  return tasks;
}

export async function findTaskByTitleAndDue(
  title: string,
  dueAt?: string,
): Promise<ReclaimTaskResponse | null> {
  const tasks = await listOpenTasks(title);
  const wanted = dueAt ? toDateInputValue(dueAt) : "";
  const match = tasks.find((task) => {
    if (task.title !== title) return false;
    if (!wanted) return true;
    return taskDueDate(task) === wanted;
  });
  return match ?? null;
}

export async function testReclaimConnection(): Promise<string> {
  const headers = await authHeaders();
  await httpJson(`${API}/api/reclaim-tasks/page?count=1&completed=false`, { headers });
  return "OK — Reclaim 2.0 tasks API reachable";
}

export async function saveApiKeyAndMark(apiKey: string): Promise<void> {
  await updatePreferences((p) => ({
    ...p,
    reclaim: {
      ...p.reclaim,
      apiKey,
      connected: Boolean(apiKey),
      lastError: undefined,
    },
  }));
}

export async function disconnectReclaim(): Promise<void> {
  await updatePreferences((p) => ({
    ...p,
    reclaim: {
      ...p.reclaim,
      apiKey: "",
      connected: false,
      lastError: undefined,
    },
  }));
}

export function getCapabilities(): ReclaimCapabilities {
  return detectCapabilities();
}
