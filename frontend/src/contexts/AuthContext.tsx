import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { apiGet, apiPost, getUnauthorizedEventName, setApiToken, type ApiItemResponse } from "@/lib/api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "COLLEGE" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
};

type AuthResponse = {
  success: boolean;
  token: string;
  item: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const TOKEN_KEY = "edu_portal_auth_token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function parseTokenExpiryMs(token: string): number | null {
  try {
    const encodedPayload = token.split(".")[0];
    if (!encodedPayload) return null;

    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(window.atob(padded)) as { exp?: number };

    if (!payload.exp) return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutTimer = useRef<number | null>(null);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimer.current) {
      window.clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
  }, []);

  const persistToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);
    setApiToken(nextToken);

    if (nextToken) {
      sessionStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    clearLogoutTimer();
    persistToken(null);
    setUser(null);
  }, [clearLogoutTimer, persistToken]);

  useEffect(() => {
    clearLogoutTimer();

    if (!token) return;

    const expiresAtMs = parseTokenExpiryMs(token);
    if (!expiresAtMs || expiresAtMs <= Date.now()) {
      logout();
      return;
    }

    const timeoutMs = expiresAtMs - Date.now();
    logoutTimer.current = window.setTimeout(() => {
      logout();
    }, timeoutMs);
  }, [clearLogoutTimer, logout, token]);

  useEffect(() => {
    const unauthorizedEvent = getUnauthorizedEventName();
    const onUnauthorized = () => {
      logout();
    };

    window.addEventListener(unauthorizedEvent, onUnauthorized);
    return () => window.removeEventListener(unauthorizedEvent, onUnauthorized);
  }, [logout]);

  useEffect(() => {
    const bootstrap = async () => {
      const savedToken = sessionStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      const expiresAtMs = parseTokenExpiryMs(savedToken);
      if (!expiresAtMs || expiresAtMs <= Date.now()) {
        logout();
        setIsLoading(false);
        return;
      }

      persistToken(savedToken);

      try {
        const response = await apiGet<ApiItemResponse<AuthUser>>("/auth/me");
        setUser(response.item);
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, [logout, persistToken]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiPost<AuthResponse, { email: string; password: string }>("/auth/login", { email, password });
    persistToken(response.token);
    setUser(response.item);
  }, [persistToken]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await apiPost<AuthResponse, { name: string; email: string; password: string }>("/auth/register", {
      name,
      email,
      password
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      register,
      logout
    }),
    [isLoading, login, logout, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

