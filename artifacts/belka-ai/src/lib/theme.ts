import { useState, useCallback, createContext, useContext } from "react";

export type Theme = "dark" | "light";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("belka-theme") as Theme) || "dark";
}

export function applyTheme(theme: Theme) {
  localStorage.setItem("belka-theme", theme);
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);
export { ThemeContext };

export function useThemeProvider(): ThemeContextType {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  const handleSetTheme = useCallback((t: Theme) => {
    applyTheme(t);
    setThemeState(t);
  }, []);

  return { theme, setTheme: handleSetTheme };
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: getTheme(), setTheme: applyTheme };
  return ctx;
}
