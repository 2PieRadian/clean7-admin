/**
 * Normalizes API error payloads from the gateway (object message vs plain string).
 */
export function normalizeApiError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Request failed.";
  }

  const envelope = payload as Record<string, unknown>;

  if (envelope.success !== false) {
    return "Request failed.";
  }

  const error = envelope.error;

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
  }

  return "Request failed.";
}
