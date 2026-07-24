"use client";

import { getGatewayUrl } from "@/lib/env";
import { normalizeApiError } from "@/lib/api-error";
import { newIdempotencyKey } from "@/lib/idempotency";
import {
  clearStoredSession,
  getStoredSession,
  isSessionTokenExpired,
} from "@/lib/browser-session";

type ApiOptions = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  /** Skip automatic idempotency header (default: add for mutating methods when auth). */
  skipIdempotency?: boolean;
};

function buildUrl(path: string, query?: ApiOptions["query"]) {
  const url = new URL(path, getGatewayUrl());

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function redirectToLoginIfClient() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (path.startsWith("/login")) return;
  window.location.assign("/login");
}

function isMutating(method: string | undefined) {
  const m = method ?? "GET";
  return m === "POST" || m === "PATCH" || m === "DELETE";
}

async function requestWithToken<T>(token: string | null, options: ApiOptions) {
  const method = options.method ?? "GET";
  const extraHeaders: Record<string, string> = { ...options.headers };

  if (
    options.requireAuth !== false &&
    isMutating(method) &&
    !options.skipIdempotency &&
    !extraHeaders["idempotency-key"] &&
    !extraHeaders["Idempotency-Key"]
  ) {
    extraHeaders["idempotency-key"] = newIdempotencyKey();
  }

  const response = await fetch(buildUrl(options.path, options.query), {
    method,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = { success: false, error: { message: "Invalid response from server." } };
  }

  return { response, json: json as T };
}

export async function apiFetch<T>(options: ApiOptions) {
  const requireAuth = options.requireAuth ?? true;
  const session = requireAuth ? getStoredSession() : null;

  if (requireAuth && session?.token && isSessionTokenExpired(session.token)) {
    clearStoredSession();
    redirectToLoginIfClient();
    return requestWithToken<T>(null, options);
  }

  const initial = await requestWithToken<T>(session?.token ?? null, options);

  if (requireAuth && initial.response.status === 401) {
    clearStoredSession();
    redirectToLoginIfClient();
  }

  return initial;
}

export async function apiRequest<T>(options: ApiOptions) {
  const { response, json } = await apiFetch<unknown>(options);

  if (!response.ok || !json || typeof json !== "object") {
    throw new Error(normalizeApiError(json));
  }

  const envelope = json as { success?: boolean; data?: T };
  if (!envelope.success) {
    throw new Error(normalizeApiError(json));
  }

  return envelope.data as T;
}
