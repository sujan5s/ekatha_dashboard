"use client";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DashUser | null>(null);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: DashUser; allowedPages: string[] }>(
        "/api/auth/me",
      );
      setUser(data.user);
      setAllowedPages(data.allowedPages ?? []);
    } catch {
      clearToken();
      setUser(null);
      setAllowedPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    clearToken();
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
