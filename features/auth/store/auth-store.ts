import { create } from "zustand";
import { getGatewayUrl } from "@/lib/env";
import {
  clearStoredSession,
  getCurrentUser,
  getStoredSession,
  isSessionTokenExpired,
  setStoredSession,
} from "@/lib/browser-session";
import { normalizeApiError } from "@/lib/api-error";
import type { ApiEnvelope, AuthUser, SessionData } from "@/lib/types";

export type AuthState = {
  loading: boolean;
  user: AuthUser | null;
  session: SessionData | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  loading: true,
  user: null,
  session: null,

  bootstrap: async () => {
    const stored = getStoredSession();

    if (!stored || isSessionTokenExpired(stored.token)) {
      clearStoredSession();
      set({ loading: false, user: null, session: null });
      return;
    }

    const currentUser = await getCurrentUser(stored);

    if (!currentUser || (currentUser.role !== "DIRECTOR" && currentUser.role !== "BRANCH_ADMIN")) {
      clearStoredSession();
      set({ loading: false, user: null, session: null });
      return;
    }

    const nextSession = {
      ...stored,
      user: currentUser,
    };

    setStoredSession(nextSession);
    set({ loading: false, user: currentUser, session: nextSession });
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${getGatewayUrl()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const json = (await response.json()) as ApiEnvelope<{
      token: string;
      user: AuthUser;
    }>;

    if (!response.ok || !json.success) {
      throw new Error(normalizeApiError(json));
    }

    if (json.data.user.role !== "DIRECTOR" && json.data.user.role !== "BRANCH_ADMIN") {
      throw new Error("This account does not have admin access.");
    }

    const nextSession: SessionData = {
      token: json.data.token,
      user: json.data.user,
    };

    setStoredSession(nextSession);
    set({ user: json.data.user, session: nextSession });
  },

  logout: async () => {
    clearStoredSession();
    set({ user: null, session: null });
  },

  reloadUser: async () => {
    const stored = getStoredSession();
    const currentUser = await getCurrentUser(stored);

    if (!stored || !currentUser) {
      clearStoredSession();
      set({ user: null, session: null });
      return;
    }

    const nextSession = {
      ...stored,
      user: currentUser,
    };

    setStoredSession(nextSession);
    set({ user: currentUser, session: nextSession });
  },
}));

export const useAuth = () => useAuthStore();
