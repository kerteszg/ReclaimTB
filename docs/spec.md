# Specification — Scheduling Companion

## Actions

| Action | Destination | When |
| --- | --- | --- |
| Email → Calendar event | Google Calendar REST | Meeting, invitation, deadline with a specific time |
| Email → Task | Reclaim tasks API | Work request with duration / deadline |

These are separate actions. A task needs deadline, estimated duration, and priority. An event needs start, end (or all-day), and optionally location.

## UI (Phase 1)

One `message_display_action` toolbar button. Popup offers:

- **New event**
- **New task**
- Status of prior creations for this message (already created / pending)
- (Phase 2) Suggestion badge count

In-message banner (Option B) is deferred to Phase 3.

### Suggestion visual states (Phase 2)

| State | Event / Task affordance |
| --- | --- |
| Mail Brain disabled | Neutral |
| Analysis in progress | Neutral + small activity indicator |
| Suggestion detected | Highlighted (no blinking) |
| Already created | Checkmark / subdued |
| Mail Brain unreachable | Neutral, still usable |

## Calendar event fields

| Field | Default / behavior |
| --- | --- |
| Title | Cleaned email subject (`Re:` / `Fwd:` / `AW:` / `Vá:` stripped) |
| Location | Empty |
| Start | Required date-time |
| End | Start + 60 minutes |
| All-day | Off |
| Blocking (Busy) | On (`transparency: opaque`) |
| Calendar | Fixed in settings; not selectable in the form |
| Time zone | Destination calendar’s time zone |
| Description | Optional; may include source Message-ID footer |
| Visibility / reminders | Collapsed Advanced section |

All-day events use `start.date` / `end.date` with an exclusive end date.

## Reclaim task fields

### Quick

| Field | Default |
| --- | --- |
| Title | Email subject or AI suggestion |
| Priority | P2 — High |
| Estimated duration | 30 minutes (configurable) |
| Due date/time | Explicit or suggested |

### Advanced

| Field | Default |
| --- | --- |
| Earliest start | Reclaim default |
| Minimum work block | Reclaim default |
| Maximum work block | Reclaim default |
| Scheduling hours | Working hours (`timeSchemeId`) |
| Notes / description | Optional |
| Calendar visibility (always private) | Reclaim default |
| Send to Up Next (`onDeck`) | Off |

Unsupported fields for the detected Reclaim version are disabled or hidden, not silently ignored. Prefer the label **Due date/time** over “End time”.

## Settings

### Google Calendar

- Connect / Disconnect OAuth
- Destination calendar (exactly one writable calendar)
- New events block my time by default
- Test connection + last error

### Reclaim

- API key
- Default priority (P2)
- Default estimated duration (30 min)
- Test connection + last error

### Mail Brain (Phase 2)

- Enable suggestions
- Server URL + auth token
- Analyze emails when opened
- Highlight detected events and tasks
- Test connection + last error

## Reliability requirements

- **Duplicate detection** — associations keyed by RFC `Message-ID`; warn before creating a second object.
- **Idempotency** — write `pending` before the provider call; recover via Google `privateExtendedProperty=reclaimtb.messageId` or Reclaim title+due match.
- **Link back to source** — store Message-ID locally; optional footer in event description / task notes.
- **Edit before save** — AI never auto-creates.
- **Connection status** — independent Test / Disconnect per integration.
- **Structured errors** — expired auth vs network vs invalid input.

## Privacy

- Google and Reclaim credentials stay in the extension (`browser.storage.local`). They are never sent to Mail Brain.
- Automatic Mail Brain analysis is opt-in and transmits only normalized message text + selected headers.
- Quoted reply chains, signatures, and attachments are excluded from analysis by default where practical.
