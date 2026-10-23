import { httpForm } from "../../lib/http.js";
import { AppError } from "../../lib/errors.js";
import { getPreferences } from "../../storage/preferences.js";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

const AUTH_STORAGE = "googleAuth";

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return b64url(new Uint8Array(digest));
}

function randomString(len = 32): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

export async function getStoredTokens(): Promise<GoogleTokens | null> {
  const result = await browser.storage.local.get(AUTH_STORAGE);
  return (result[AUTH_STORAGE] as GoogleTokens) || null;
}

export async function setStoredTokens(tokens: GoogleTokens | null): Promise<void> {
  if (!tokens) {
    await browser.storage.local.remove(AUTH_STORAGE);
  } else {
    await browser.storage.local.set({ [AUTH_STORAGE]: tokens });
  }
}

export async function getRedirectUrl(): Promise<string> {
  return browser.identity.getRedirectURL();
}

export async function connectGoogle(): Promise<GoogleTokens> {
  const prefs = await getPreferences();
  if (!prefs.google.clientId) {
    throw new AppError("not_configured", "Google Client ID is not set in Settings.");
  }

  const verifier = randomString(32);
  const challenge = await sha256Base64Url(verifier);
  const state = randomString(16);
  const redirectUri = await getRedirectUrl();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", prefs.google.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  const redirected = await browser.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  const returned = new URL(redirected);
  const err = returned.searchParams.get("error");
  if (err) throw new AppError("auth_required", `Google auth error: ${err}`);
  const code = returned.searchParams.get("code");
  const returnedState = returned.searchParams.get("state");
  if (!code) throw new AppError("auth_required", "No authorization code returned.");
  if (returnedState !== state) throw new AppError("auth_required", "OAuth state mismatch.");

  const params: Record<string, string> = {
    client_id: prefs.google.clientId,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  };
  if (prefs.google.clientSecret) {
    params.client_secret = prefs.google.clientSecret;
  }

  const tokenResponse = await httpForm<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type?: string;
  }>("https://oauth2.googleapis.com/token", params);

  const tokens: GoogleTokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000 - 60_000,
    tokenType: tokenResponse.token_type,
  };

  // Preserve previous refresh token if Google omitted a new one
  if (!tokens.refreshToken) {
    const prev = await getStoredTokens();
    if (prev?.refreshToken) tokens.refreshToken = prev.refreshToken;
  }

  await setStoredTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(): Promise<GoogleTokens> {
  const prefs = await getPreferences();
  const current = await getStoredTokens();
  if (!current?.refreshToken) {
    throw new AppError("auth_expired", "No refresh token. Please reconnect Google.");
  }
  if (!prefs.google.clientId) {
    throw new AppError("not_configured", "Google Client ID is not set.");
  }

  const params: Record<string, string> = {
    client_id: prefs.google.clientId,
    refresh_token: current.refreshToken,
    grant_type: "refresh_token",
  };
  if (prefs.google.clientSecret) {
    params.client_secret = prefs.google.clientSecret;
  }

  const tokenResponse = await httpForm<{
    access_token: string;
    expires_in: number;
    token_type?: string;
  }>("https://oauth2.googleapis.com/token", params);

  const tokens: GoogleTokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: current.refreshToken,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000 - 60_000,
    tokenType: tokenResponse.token_type,
  };
  await setStoredTokens(tokens);
  return tokens;
}

export async function getValidAccessToken(): Promise<string> {
  let tokens = await getStoredTokens();
  if (!tokens) throw new AppError("auth_required", "Google is not connected.");
  if (Date.now() >= tokens.expiresAt) {
    tokens = await refreshAccessToken();
  }
  return tokens.accessToken;
}

export async function disconnectGoogle(): Promise<void> {
  await setStoredTokens(null);
}
