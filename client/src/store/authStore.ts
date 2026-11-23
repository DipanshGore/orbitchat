import { create } from "zustand";
import { UserSummary, UserStatus } from "../types";
import { apiFetch } from "../lib/api";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";

interface AuthState {
  user: UserSummary | null;
  isLoading: boolean;
  isReconnecting: boolean;
  isIdentityModalOpen: boolean;
  soundEnabled: boolean;
  theme: "system" | "light" | "dark";

  setUser: (user: UserSummary | null) => void;
  setIsReconnecting: (status: boolean) => void;
  setIdentityModalOpen: (open: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTheme: (theme: "system" | "light" | "dark") => void;

  checkAuth: () => Promise<UserSummary | null>;
  login: (identifier: string, password: string) => Promise<UserSummary>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    displayName: string;
    avatar?: string;
  }) => Promise<UserSummary>;
  quickGuest: (displayName?: string) => Promise<UserSummary>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    displayName?: string;
    avatar?: string;
    status?: UserStatus;
    customStatus?: string | null;
  }) => Promise<UserSummary>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isReconnecting: false,
  isIdentityModalOpen: false,
  soundEnabled: true,
  theme: "dark",

  setUser: (user) => set({ user }),
  setIsReconnecting: (isReconnecting) => set({ isReconnecting }),
  setIdentityModalOpen: (isIdentityModalOpen) => set({ isIdentityModalOpen }),
  setSoundEnabled: (enabled) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orbit_sound_enabled", enabled ? "true" : "false");
    }
    set({ soundEnabled: enabled });
  },
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orbit_theme", theme);
      applyTheme(theme);
    }
    set({ theme });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await apiFetch<{ user: UserSummary }>("/api/auth/me");
      set({ user: res.user, isLoading: false });
      connectSocket();
      return res.user;
    } catch {
      set({ user: null, isLoading: false });
      return null;
    }
  },

  login: async (identifier, password) => {
    const res = await apiFetch<{ user: UserSummary }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    set({ user: res.user });
    connectSocket();
    return res.user;
  },

  register: async (payload) => {
    const res = await apiFetch<{ user: UserSummary }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    set({ user: res.user });
    connectSocket();
    return res.user;
  },

  quickGuest: async (displayName) => {
    const res = await apiFetch<{ user: UserSummary }>("/api/auth/guest", {
      method: "POST",
      body: JSON.stringify({ displayName }),
    });
    set({ user: res.user });
    connectSocket();
    return res.user;
  },

  logout: async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    disconnectSocket();
    set({ user: null });
  },

  updateProfile: async (data) => {
    const res = await apiFetch<{ user: UserSummary }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    set({ user: res.user });

    // Broadcast presence change through socket
    const socket = getSocket();
    if (socket && socket.connected && data.status) {
      socket.emit("presence:change", {
        status: data.status,
        customStatus: data.customStatus,
      });
    }

    return res.user;
  },
}));

function applyTheme(theme: "system" | "light" | "dark") {
  const root = document.documentElement;
  if (theme === "system") {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (systemDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } else if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

