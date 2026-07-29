"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UserDto, LoginInput, RegisterInput } from "@job-tracker/shared";
import { refreshAccessToken, tokenStore } from "@/lib/api-client";
import * as authApi from "@/lib/api/auth";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: UserDto | null;
  status: Status;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = await refreshAccessToken();

      if (!token) {
        if (!cancelled) setStatus("anonymous");
        return;
      }

      try {
        const me = await authApi.fetchMe();
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) {
          tokenStore.set(null);
          setStatus("anonymous");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const res = await authApi.login(input);
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await authApi.register(input);
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
