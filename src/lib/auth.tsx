"use client";
//hi
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, clearToken } from "./api";
import type { DashUser } from "./types";

interface AuthState {
  user: DashUser | null;
  allowedPages: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_CACHE_KEY = "ekatha_auth";
const SWR_CACHE_KEY = "ekatha_swr_cache";

interface CachedAuth {
  user: DashUser;
  allowedPages: string[];
}

function readCachedAuth(): CachedAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedAuth) : null;
  } catch {
    return null;
  }
}

function writeCachedAuth(value: CachedAuth | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // Storage unavailable: fall back to in-memory only.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashUser | null>(null);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: DashUser; allowedPages: string[] }>(
        "/api/auth/me",
      );
      const pages = data.allowedPages ?? [];
      setUser(data.user);
      setAllowedPages(pages);
      writeCachedAuth({ user: data.user, allowedPages: pages });
    } catch {
      clearToken();
      writeCachedAuth(null);
      setUser(null);
      setAllowedPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Paint the shell immediately from the last-known session, then revalidate
    // against the server in the background so nothing blocks on /api/auth/me.
    // Applying cached state synchronously here (rather than as lazy initial
    // state) is deliberate: the server-rendered HTML and the first client render
    // both start in the loading state, so there is no hydration mismatch.
    const cached = readCachedAuth();
    if (cached) {
      /* eslint-disable react-hooks/set-state-in-effect -- intentional one-shot hydration from localStorage; see note above */
      setUser(cached.user);
      setAllowedPages(cached.allowedPages);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    void refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    clearToken();
    writeCachedAuth(null);
    // Drop cached content so the next account on this machine starts clean.
    try {
      window.localStorage.removeItem(SWR_CACHE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setAllowedPages([]);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, allowedPages, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
