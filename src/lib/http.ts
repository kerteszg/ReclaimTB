import { AppError } from "./errors.js";

export interface HttpOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export async function httpJson<T = unknown>(
  url: string,
  options: HttpOptions = {},
): Promise<T> {
  const { method = "GET", headers = {}, body, signal } = options;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new AppError("network", `Failed to reach ${url}`, err);
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (res.status === 401 || res.status === 403) {
    throw new AppError("auth_expired", `Auth failed (${res.status})`, json);
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "error" in json
        ? String((json as { error: unknown }).error)
        : `${method} ${url} → ${res.status}`;
    throw new AppError("provider", msg, json);
  }

  return json as T;
}

export async function httpForm<T = unknown>(
  url: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(params).toString(),
    });
  } catch (err) {
    throw new AppError("network", `Failed to reach ${url}`, err);
  }
  const json = (await res.json()) as T & { error?: string; error_description?: string };
  if (!res.ok) {
    const msg =
      (json as { error_description?: string }).error_description ||
      (json as { error?: string }).error ||
      `HTTP ${res.status}`;
    throw new AppError("auth_expired", msg, json);
  }
  return json;
}
