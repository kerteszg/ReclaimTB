# Architecture

## Overview

```
Thunderbird (opened message)
        │
        ▼
message_display_action popup
        │
        ▼
Background (message context, scheduling, associations)
   ├── Event editor ──► Google Calendar provider (OAuth PKCE)
   ├── Task editor  ──► Reclaim provider (API key)
   └── SuggestionProvider
         ├── NullSuggestionProvider (always)
         └── MailBrainSuggestionProvider (Phase 2)
```

Mail Brain never creates calendar events or Reclaim tasks. It only returns suggestions that prefill the same editors used without AI.

## Modules

| Module | Responsibility |
| --- | --- |
| `background/message-context` | Track displayed message; expose headers, subject, cleaned text |
| `background/scheduling` | Orchestrate create + association + duplicate check |
| `providers/google-calendar` | OAuth, calendar list, `events.insert` mapping |
| `providers/reclaim` | API key client, 2.0 task mapper, capabilities |
| `providers/suggestions` | Pluggable suggestion interface |
| `storage/preferences` | Typed settings + schema version |
| `storage/associations` | Message-ID → created objects |
| `models` | Provider-independent Event / Task / Suggestion |
| `ui/*` | Popup, editors, settings |

## Data flow — create event

1. User opens popup → **New event**.
2. Background supplies message context (subject, Message-ID, cleaned body excerpt).
3. Event editor opens with defaults (and optional suggestion prefill).
4. On save: association `pending` → Google `events.insert` → association `created` (or `failed`).
5. Notification with `htmlLink`.

## Data flow — create task

Same pattern against Reclaim `POST /api/reclaim-tasks`. Duration is sent as `estimateMinutes`, and due and start are calendar dates. Duplicate recovery lists `GET /api/reclaim-tasks/page`.

## Storage keys

- `preferences` — settings object with `schemaVersion`
- `associations` — map of Message-ID → `Association[]`
- `googleAuth` — tokens (access, refresh, expiry)
- `googleCalendar` — selected `calendarId`, time zone, account email
- `reclaimAuth` — API key (and optional capabilities cache)

## Extension permissions

- Always: `messagesRead`, `storage`, `identity`, `notifications`
- Host: Google OAuth + Calendar APIs, `https://api.app.reclaim.ai/*`
- Optional (Phase 2): `<all_urls>` requested when a Mail Brain URL is set

## Independence from Mail Brain

The Mail Brain repository only implements `POST /api/v1/scheduling/analyze` per [mailbrain-api.md](mailbrain-api.md). This extension does not import Mail Brain code and does not require its Thunderbird add-on.
