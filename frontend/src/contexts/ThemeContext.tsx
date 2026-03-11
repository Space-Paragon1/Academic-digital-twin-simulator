"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // On mount, read saved preference or system preference
  useEffect(() => {
    const saved = localStorage.getItem("adt_theme") as Theme | null;
    const preferred =
      saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeState(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
  }, []);

  const applyTheme = (next: Theme) => {
    localStorage.setItem("adt_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    setThemeState(next);
  };

  const toggle = () => {
    applyTheme(theme === "light" ? "dark" : "light");
  };

  const setTheme = (t: Theme) => applyTheme(t);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
