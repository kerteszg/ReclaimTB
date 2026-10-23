/**
 * Phase 0: Google OAuth (loopback) → list calendars → insert + delete a test event.
 * Usage: set GOOGLE_CLIENT_ID (and optionally GOOGLE_CLIENT_SECRET) in .env,
 * then `npm run feasibility:google`
 */
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const outDir = join(__dirname, "output");
const REDIRECT = "http://127.0.0.1:8765/oauth2callback";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

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

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
if (!clientId) {
  console.error("Missing GOOGLE_CLIENT_ID. Copy .env.example → .env and set it.");
  process.exit(1);
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function openBrowser(url) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

function waitForCode(expectedState) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const u = new URL(req.url, REDIRECT);
        if (u.pathname !== "/oauth2callback") {
          res.writeHead(404);
          res.end();
          return;
        }
        const err = u.searchParams.get("error");
        if (err) {
          res.end(`Error: ${err}`);
          server.close();
          reject(new Error(err));
          return;
        }
        const code = u.searchParams.get("code");
        const state = u.searchParams.get("state");
        if (state !== expectedState) {
          res.end("Invalid state");
          server.close();
          reject(new Error("OAuth state mismatch"));
          return;
        }
        res.end("Authorization received. You can close this tab and return to the terminal.");
        server.close();
        resolve(code);
      } catch (e) {
        reject(e);
      }
    });
    server.listen(8765, "127.0.0.1");
  });
}

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT,
  });
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  return json;
}

async function gfetch(accessToken, path, options = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text}`);
  return json;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const { verifier, challenge } = pkce();
  const state = b64url(randomBytes(16));

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  console.log("Opening browser for Google consent…");
  console.log("(Ensure redirect URI is registered:", REDIRECT, ")");
  openBrowser(authUrl.toString());

  const code = await waitForCode(state);
  console.log("Exchanging code…");
  const tokens = await exchangeCode(code, verifier);
  writeFileSync(join(outDir, "google-tokens.json"), JSON.stringify({ ...tokens, access_token: "***" }, null, 2));

  console.log("Listing calendars…");
  const list = await gfetch(tokens.access_token, "/users/me/calendarList");
  writeFileSync(join(outDir, "google-calendars.json"), JSON.stringify(list, null, 2));
  for (const c of list.items || []) {
    console.log(`  ${c.summary}  id=${c.id}  access=${c.accessRole}`);
  }

  const primary =
    (list.items || []).find((c) => c.primary) ||
    (list.items || []).find((c) => c.accessRole === "owner" || c.accessRole === "writer");
  if (!primary) {
    console.error("No writable calendar found.");
    process.exit(1);
  }

  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const event = {
    summary: `[ReclaimTB Phase0] Test event ${new Date().toISOString()}`,
    description: "Created by scripts/feasibility/google-list-calendars.mjs",
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    transparency: "opaque",
    extendedProperties: {
      private: { "reclaimtb.messageId": "phase0-test" },
    },
  };

  console.log(`\nInserting test event on "${primary.summary}"…`);
  const created = await gfetch(
    tokens.access_token,
    `/calendars/${encodeURIComponent(primary.id)}/events`,
    { method: "POST", body: JSON.stringify(event) },
  );
  writeFileSync(join(outDir, "google-event-created.json"), JSON.stringify(created, null, 2));
  console.log("Created:", created.htmlLink || created.id);

  console.log("Deleting test event…");
  await gfetch(
    tokens.access_token,
    `/calendars/${encodeURIComponent(primary.id)}/events/${encodeURIComponent(created.id)}`,
    { method: "DELETE" },
  );
  console.log("Deleted. Output under scripts/feasibility/output/ (gitignored).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
