# ReclaimTB — Thunderbird Scheduling Companion

A Thunderbird MailExtension that turns the email you are reading into a **Google Calendar event** or a **Reclaim.ai task**, with an optional Mail Brain suggestion layer later.

Created with Claude Fable and Grok agents.

## Principles

1. **Fully functional without AI** — Google Calendar and Reclaim never depend on Mail Brain.
2. **AI suggests; you decide** — forms, validation, and creation stay in the extension.
3. **Independent integrations** — Google, Reclaim, and Mail Brain are separate modules.

## Mail Brain (optional)

[Mail Brain](docs/mailbrain-api.md) is a separate private service that can analyze an email and return **suggestions** for calendar events or Reclaim tasks (title, times, priority, etc.). This extension never lets it create anything on its own — suggestions only prefill the same editors you use without AI.

Mail Brain may not be publicly available when this project is published. That is fine: Google Calendar and Reclaim work with it disabled, unreachable, or never configured. The API contract is documented here so a compatible backend can be pointed at later if one exists.

## Requirements

- Thunderbird 128 ESR or newer
- Node.js 20+ (for building)
- A Google account with Calendar API access
- A Reclaim.ai account with an API key (1.0 semantics targeted first)



## Quick start

```bash
npm install
npm run build
```

Then in Thunderbird: **Settings → Add-ons → Debug Add-ons → Load Temporary Add-on…** and select `dist/manifest.json`.

Open the extension options to connect Google Calendar and enter your Reclaim API key. See:

- [docs/setup-google-oauth.md](docs/setup-google-oauth.md)
- [docs/setup-reclaim.md](docs/setup-reclaim.md)



## Scripts


| Command                       | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `npm run build`               | Bundle TypeScript into `dist/`                           |
| `npm test`                    | Run Vitest unit tests                                    |
| `npm run lint:ext`            | Build + `web-ext lint`                                   |
| `npm run feasibility:reclaim` | Phase 0: create/read/delete a Reclaim task               |
| `npm run feasibility:google`  | Phase 0: OAuth, list calendars, insert/delete test event |


Credentials for feasibility scripts go in `.env` (see `.env.example`). Never commit secrets.

## Documentation

- [Specification](docs/spec.md)
- [Architecture](docs/architecture.md)
- [Mail Brain API contract](docs/mailbrain-api.md)
- [Roadmap](docs/roadmap.md)



## License

MIT — see [LICENSE](LICENSE).