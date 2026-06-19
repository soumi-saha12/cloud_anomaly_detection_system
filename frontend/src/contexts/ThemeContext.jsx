import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    return localStorage.getItem("theme") || "dark";
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }

    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Ignore storage write failures and keep the in-memory theme state.
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
