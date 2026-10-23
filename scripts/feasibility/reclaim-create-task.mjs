/**
 * Create → read → list → delete a Reclaim 2.0 task.
 * Usage: set RECLAIM_API_KEY in .env, then `npm run feasibility:reclaim`
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const outDir = join(__dirname, "output");

function loadEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const API = "https://api.app.reclaim.ai";
const key = process.env.RECLAIM_API_KEY;
if (!key) {
  console.error("Missing RECLAIM_API_KEY. Copy .env.example → .env and set it.");
  process.exit(1);
}

async function reclaim(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function pathId(id) {
  const match = String(id).trim().match(/^RECLAIM:(\d+)$/i);
  return match ? match[1] : String(id);
}

function calendarDate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  let d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    d = new Date(String(value).replace(/(\.\d{3})\d+/, "$1"));
  }
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const due = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const dueDate = calendarDate(due.toISOString());

  const payload = {
    title: `[ReclaimTB] Test task ${new Date().toISOString()}`,
    description: "Created by scripts/feasibility/reclaim-create-task.mjs — safe to delete.",
    priority: "P2",
    estimateMinutes: 45,
    dueDate,
  };

  console.log("Creating task…");
  console.log(JSON.stringify(payload, null, 2));
  const created = await reclaim("POST", "/api/reclaim-tasks", payload);
  writeFileSync(join(outDir, "reclaim-created.json"), JSON.stringify(created, null, 2));
  console.log("Created id:", created.id ?? created);

  const id = created.id;
  if (!id) {
    console.error("No id in create response; inspect scripts/feasibility/output/reclaim-created.json");
    process.exit(1);
  }

  try {
  console.log("Reading task back…");
  const read = await reclaim("GET", `/api/reclaim-tasks/${pathId(id)}`);
  writeFileSync(join(outDir, "reclaim-read.json"), JSON.stringify(read, null, 2));

  const checks = [
    ["title", payload.title, read.title],
    ["priority", payload.priority, read.priority],
    ["estimateMinutes", payload.estimateMinutes, read.estimateMinutes],
    ["description", payload.description, read.description],
    ["dueDate", payload.dueDate, calendarDate(read.due || read.dueDate)],
  ];
  console.log("\nRound-trip check:");
  for (const [name, sent, got] of checks) {
    const ok = String(sent) === String(got);
    console.log(`  ${name}: ${ok ? "OK" : "DIFF"} sent=${JSON.stringify(sent)} got=${JSON.stringify(got)}`);
  }

  console.log("\nListing open tasks…");
  const page = await reclaim(
    "GET",
    `/api/reclaim-tasks/page?completed=false&count=50&query=${encodeURIComponent(payload.title)}`,
  );
  writeFileSync(join(outDir, "reclaim-list.json"), JSON.stringify(page, null, 2));
  const items = Array.isArray(page) ? page : page.items || page.tasks || [];
  const listed = items.some((item) => String(item.id) === String(id));
  console.log(`  listed in /api/reclaim-tasks/page: ${listed ? "OK" : "MISSING"} (${items.length} item(s))`);

  } finally {
    console.log("\nDeleting task…");
    await reclaim("DELETE", `/api/reclaim-tasks/${pathId(id)}`);
    console.log("Deleted. Output written to scripts/feasibility/output/ (gitignored).");
  }
}

main().catch((err) => {
  console.error(err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
