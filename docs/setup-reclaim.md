# Reclaim.ai API setup

## 1. Obtain an API key

1. Sign in to [Reclaim](https://app.reclaim.ai/).
2. Open **Settings → Developer / Integrations** (wording may vary by plan).
3. Create or copy an **API key**.

Zapier and Make document Reclaim API-key auth under Developer settings; use the same key here.

## 2. Enter the key in the extension

Open extension options → Reclaim:

1. Paste the API key.
2. Click **Test connection**.
3. Set default priority (P2) and default duration (30 minutes) if desired.

## 3. Phase 0 verification

```bash
cp .env.example .env
# set RECLAIM_API_KEY
npm run feasibility:reclaim
```

The script will:

1. `POST /api/reclaim-tasks` with title, priority, `estimateMinutes`, and `dueDate`.
2. `GET` the created task and confirm it appears in `GET /api/reclaim-tasks/page`.
3. `DELETE` the task.

## API surface (Reclaim 2.0 tasks)

Base: `https://api.app.reclaim.ai`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/reclaim-tasks/page` | List tasks (the list the 2.0 app shows) |
| POST | `/api/reclaim-tasks` | Create task |
| GET | `/api/reclaim-tasks/{id}` | Get task |
| PATCH | `/api/reclaim-tasks/{id}` | Update |
| DELETE | `/api/reclaim-tasks/{id}` | Delete |

`/api/tasks` is the Reclaim 1.0 collection. Creates there succeed and do not appear in the 2.0 Tasks page.

Create and list responses identify a task as `RECLAIM:{number}` (for example `RECLAIM:213961`). `GET` and `DELETE` take the numeric suffix only.

Auth header: `Authorization: Bearer <apiKey>`

### Mapping notes

- Duration minutes → `estimateMinutes`.
- Due → `dueDate` (`YYYY-MM-DD`).
- Start → `startDate` (`YYYY-MM-DD`).
- Notes and source email → `description`.
- Priority stays `P1`–`P4`.

Reclaim 2.0 does not auto-schedule a calendar block per task. Min/max block, scheduling hours, Up Next, privacy, and work/personal category are 1.0 fields and are not sent.

## Security notes

- Store the API key only in extension settings / `.env` for scripts.
- Never send the Reclaim key to Mail Brain.
