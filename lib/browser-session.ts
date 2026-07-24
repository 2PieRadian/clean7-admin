"use client";

import { getGatewayUrl } from "@/lib/env";
import { normalizeApiError } from "@/lib/api-error";
import type { ApiEnvelope, AuthUser, SessionData } from "@/lib/types";

const STORAGE_KEY = "waw_admin_frontend_session";

function hasWindow() {
  return typeof window !== "undefined";
}

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
  } catch {
    return null;
  }
}

export function isSessionTokenExpired(token: string, skewSeconds = 30) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) return false;

  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function getStoredSession() {
  if (!hasWindow()) return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function setStoredSession(session: SessionData) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function getCurrentUser(session?: SessionData | null) {
  const activeSession = session ?? getStoredSession();

  if (!activeSession) return null;

  const response = await fetch(`${getGatewayUrl()}/auth/me`, {
    headers: {
      Authorization: `Bearer ${activeSession.token}`,
    },
  });

  if (response.status === 401) {
    clearStoredSession();
    return null;
  }

  const json = (await response.json()) as ApiEnvelope<AuthUser>;

  if (!response.ok || !json.success) {
    return null;
  }

  const nextSession: SessionData = {
    ...activeSession,
    user: json.data,
  };

  setStoredSession(nextSession);
  return json.data;
}
