import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "default" | "clean-blue" | "clean-green" | "clean-purple" | "clean-pink";

const STORAGE_KEY = "app-theme";

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "default",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as Theme | null;
      return v ?? "default";
    } catch {
      return "default";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-clean-blue", "theme-clean-green", "theme-clean-purple", "theme-clean-pink");
    if (theme !== "default") root.classList.add(`theme-${theme}`);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* noop */ }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
