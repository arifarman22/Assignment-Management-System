"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthUser } from "@/types";

interface AuthCtx {
  auth: AuthUser | null;
  setAuth: (a: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("auth");
    if (raw) setAuthState(JSON.parse(raw));
  }, []);

  const setAuth = (a: AuthUser | null) => {
    if (a) localStorage.setItem("auth", JSON.stringify(a));
    else localStorage.removeItem("auth");
    setAuthState(a);
  };

  const logout = () => setAuth(null);

  return <AuthContext.Provider value={{ auth, setAuth, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
