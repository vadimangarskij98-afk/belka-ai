import { useState, useEffect, useCallback, createContext, useContext } from "react";

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

function getStoredToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("belka-token") : null;
}

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("belka-user");
  return raw ? JSON.parse(raw) : null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export { AuthContext };

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("belka-token", data.token);
      localStorage.setItem("belka-user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }
      const data = await res.json();
      localStorage.setItem("belka-token", data.token);
      localStorage.setItem("belka-user", JSON.stringify(data.user));
      const avatarStyles = ["bottts", "bottts-neutral", "thumbs", "shapes", "icons"];
      const seed = username + Date.now();
      let hash = 0;
      for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash) + seed.charCodeAt(i); hash |= 0; }
      const style = avatarStyles[Math.abs(hash) % avatarStyles.length];
      const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0a0a23,1a1a3e,0d1b2a,1b2838&backgroundType=gradientLinear`;
      localStorage.setItem(`belka-avatar-${data.user.id}`, avatarUrl);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("belka-token");
    localStorage.removeItem("belka-user");
    localStorage.removeItem("belka-plan");
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.role === "admin";

  return { user, token, loading, login, register, logout, isAdmin };
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return useAuthProvider();
  }
  return ctx;
}
