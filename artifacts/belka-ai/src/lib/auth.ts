import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { apiFetch, buildApiUrl, jsonHeaders } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  plan: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export { AuthContext };

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const res = await apiFetch(buildApiUrl("/auth/session"));
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        if (cancelled) return;
        setUser(data.authenticated ? data.user : null);
      } catch {
        if (cancelled) return;
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(buildApiUrl("/auth/login"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(buildApiUrl("/auth/register"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ email, username, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }
      const data = await res.json();
      const avatarStyles = ["bottts", "bottts-neutral", "thumbs", "shapes", "icons"];
      const seed = username + Date.now();
      let hash = 0;
      for (let index = 0; index < seed.length; index += 1) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(index);
        hash |= 0;
      }
      const style = avatarStyles[Math.abs(hash) % avatarStyles.length];
      const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0a0a23,1a1a3e,0d1b2a,1b2838&backgroundType=gradientLinear`;
      localStorage.setItem(`belka-avatar-${data.user.id}`, avatarUrl);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    void apiFetch(buildApiUrl("/auth/logout"), { method: "POST" });
    localStorage.removeItem("belka-plan");
    setUser(null);
  }, []);

  const isAdmin = user?.role === "admin";
  const token = user ? "session" : null;

  return { user, token, loading, login, register, logout, isAdmin };
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return useAuthProvider();
  }
  return ctx;
}
