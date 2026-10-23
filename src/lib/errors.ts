export type ErrorCode =
  | "auth_expired"
  | "auth_required"
  | "network"
  | "invalid_input"
  | "not_configured"
  | "provider"
  | "duplicate"
  | "unknown";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly causeDetail?: unknown;

  constructor(code: ErrorCode, message: string, causeDetail?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.causeDetail = causeDetail;
  }
}

export function toAppError(err: unknown, fallback: string = "Unexpected error"): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof TypeError && /fetch|network/i.test(String(err.message))) {
    return new AppError("network", err.message || "Network failure", err);
  }
  if (err instanceof Error) {
    return new AppError("unknown", err.message || fallback, err);
  }
  return new AppError("unknown", fallback, err);
}

export function userMessage(err: unknown): string {
  const e = toAppError(err);
  switch (e.code) {
    case "auth_expired":
      return "Authentication expired. Please reconnect in Settings.";
    case "auth_required":
      return "Not connected. Open Settings to connect.";
    case "network":
      return "Network error. Check your connection and try again.";
    case "invalid_input":
      return e.message || "Invalid input.";
    case "not_configured":
      return e.message || "Integration is not configured.";
    case "duplicate":
      return e.message || "Already created from this email.";
    case "provider":
      return e.message || "Provider rejected the request.";
    default:
      return e.message || "Something went wrong.";
  }
}
