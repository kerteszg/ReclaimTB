# Mail Brain scheduling analysis API

Versioned HTTP contract between **Scheduling Companion** and **Mail Brain**. Mail Brain returns suggestions only; it never creates Google Calendar events or Reclaim tasks.

## Endpoint

```
POST /api/v1/scheduling/analyze
Content-Type: application/json
Authorization: Bearer <token>   # or scheme agreed with Mail Brain
```

## Request

```json
{
  "schema_version": "1.0",
  "message": {
    "message_id": "<abc123@example.com>",
    "subject": "Thesis proposal review",
    "from": "student@university.edu",
    "date": "2026-10-18T09:15:00+02:00",
    "timezone": "Europe/Budapest",
    "text": "Could you review my revised thesis proposal before Friday? I would also like to meet next Tuesday around 10:00."
  },
  "locale": "en"
}
```

Notes:

- `text` is normalized plain text with quoted replies and signatures stripped by the extension when practical.
- Attachments are not sent.
- Automatic analysis is opt-in on the client.

## Response

```json
{
  "schema_version": "1.0",
  "suggestions": [
    {
      "id": "suggestion-1",
      "type": "event",
      "confidence": 0.94,
      "fields": {
        "title": "Thesis consultation",
        "start": "2026-10-20T10:00:00+02:00",
        "end": "2026-10-20T11:00:00+02:00",
        "location": null,
        "all_day": false
      },
      "evidence": "Could we meet on Tuesday at 10?",
      "assumptions": []
    },
    {
      "id": "suggestion-2",
      "type": "task",
      "confidence": 0.88,
      "fields": {
        "title": "Review thesis proposal",
        "priority": "P2",
        "duration_minutes": 45,
        "due_at": "2026-10-23T17:00:00+02:00"
      },
      "evidence": "Please review it before Friday",
      "assumptions": [
        "due_at time assumed 17:00 because only a day was given"
      ]
    }
  ]
}
```

### Field rules

| Field | Type | Notes |
| --- | --- | --- |
| `schema_version` | string | Must be `"1.0"` for this contract |
| `suggestions[].id` | string | Stable within one response |
| `suggestions[].type` | `"event"` \| `"task"` | |
| `suggestions[].confidence` | number 0–1 | Low confidence should not be presented as fact |
| `suggestions[].fields` | object | Prefill keys for the matching editor |
| `suggestions[].evidence` | string | Short supporting excerpt |
| `suggestions[].assumptions` | string[] | Inferred values the UI should flag |

### Event fields

- `title` (string)
- `start` (ISO 8601)
- `end` (ISO 8601, optional)
- `location` (string \| null)
- `all_day` (boolean)

### Task fields

- `title` (string)
- `priority` (`"P1"` \| `"P2"` \| `"P3"` \| `"P4"`, optional)
- `duration_minutes` (number, optional)
- `due_at` (ISO 8601, optional)

## Errors

| HTTP | Meaning |
| --- | --- |
| 400 | Invalid request body |
| 401 | Auth failure |
| 503 | Analyzer unavailable |
| 5xx | Server error |

On any error or unreachable host, the extension falls back to blank forms (`NullSuggestionProvider` behavior). The UI must not block on analysis.

## Client lifecycle

1. Debounce analysis when a message is displayed.
2. Cancel / ignore stale responses when the user switches messages.
3. Cache completed results per message fingerprint (Message-ID + body hash).
4. Multiple suggestions of both types in one email are supported.
