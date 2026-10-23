# Google Calendar OAuth setup

The extension uses OAuth 2.0 Authorization Code + PKCE via Thunderbird’s `identity.launchWebAuthFlow()`.

## 1. Create a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `ReclaimTB`).
3. Enable **Google Calendar API**.

## 2. Configure the OAuth consent screen

1. APIs & Services → OAuth consent screen.
2. User type: **External** (or Internal if Workspace-only).
3. App name: `Scheduling Companion` (or similar).
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add your Google account as a test user while the app is in Testing.

## 3. Create OAuth client credentials

1. Credentials → Create credentials → OAuth client ID.
2. Application type: **Desktop app** (or Web application if you prefer).
3. Note the **Client ID** (and Client Secret if shown).

For Thunderbird MailExtensions, the redirect URI is provided by:

```js
browser.identity.getRedirectURL()
```

It typically looks like `https://<extension-id>.extensions.allizom.org/` (or a similar Mozilla identity redirect). After loading the temporary add-on once, copy the redirect URL from the Settings page (or browser console) and add it under **Authorized redirect URIs** if your client type requires it.

## 4. Enter credentials in the extension

Open the extension options → Google Calendar:

1. Paste Client ID (and Client Secret if your client type uses one).
2. Click **Connect**.
3. Complete the Google consent dialog.
4. Choose **exactly one** writable calendar as the destination.
5. Optionally keep “New events block my time by default” enabled.

## 5. Phase 0 script (optional)

```bash
cp .env.example .env
# set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
npm run feasibility:google
```

The script uses a local loopback redirect (`http://127.0.0.1:8765/oauth2callback`). Add that URI to the OAuth client for script testing.

## Security notes

- Do not commit Client Secret or refresh tokens.
- Tokens are stored in `browser.storage.local` inside Thunderbird.
- Credentials are never sent to Mail Brain.
