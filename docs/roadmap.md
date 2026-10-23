# Roadmap

## Phase 0 — API feasibility

**Goal:** Prove Google OAuth + Calendar insert and Reclaim task CRUD against real accounts before heavy UI work.

| Check | Status | Notes |
| --- | --- | --- |
| Reclaim create / read / delete | Pending | Run `npm run feasibility:reclaim` |
| Priority round-trip | Pending | |
| Duration (`timeChunksRequired`) round-trip | Pending | |
| Due date round-trip | Pending | |
| Advanced fields (snoozeUntil, onDeck, min/max chunk, timeSchemeId, alwaysPrivate) | Pending | Record failures here |
| Google PKCE + calendar list | Pending | Run `npm run feasibility:google` |
| Google insert Busy event + delete | Pending | |

## Phase 1 — Standalone extension (current implementation target)

**Acceptance:** With Mail Brain offline / nonexistent:

- [ ] Settings connect / test / disconnect Google and Reclaim independently
- [ ] Opened email → New event → appears on selected Google Calendar as Busy by default
- [ ] Opened email → New task → appears in Reclaim with priority / duration / due
- [ ] Duplicate warning when Message-ID already has a created association
- [ ] `npm test` passes
- [ ] `npm run lint:ext` clean
- [ ] Loads as temporary add-on in Thunderbird 128 ESR and current release

## Phase 2 — Optional AI assistance

- [ ] `MailBrainSuggestionProvider` implementing [mailbrain-api.md](mailbrain-api.md)
- [ ] Opt-in auto-analysis on message display (debounced, cached, stale discarded)
- [ ] Badge / highlight states; prefilled editors with assumption flags
- [ ] UI never blocks on analysis; unreachable Mail Brain → blank forms

## Phase 3 — Reliability and refinement

- [ ] In-message action bar (Option B)
- [ ] Conflict warning via Google `freeBusy`
- [ ] Context-menu actions on message list
- [ ] Keyboard shortcuts
- [ ] Retry-without-duplicate hardening
- [ ] Automated integration tests where practical

## Out of scope (for now)

- Multiple destination Google calendars at once
- Recurring events / attendees UI
- Routing Google/Reclaim credentials through Mail Brain
- Monolithic merge with the Mail Brain Thunderbird extension
