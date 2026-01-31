"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("ear-plug-theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemDark);
      localStorage.removeItem("ear-plug-theme");
    } else {
      root.classList.toggle("dark", theme === "dark");
      localStorage.setItem("ear-plug-theme", theme);
    }
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  if (!mounted) {
    return (
      <div className={cn("w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse", className)} />
    );
  }

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "p-2.5 rounded-full transition-colors",
        "bg-gray-100 dark:bg-gray-800",
        "hover:bg-gray-200 dark:hover:bg-gray-700",
        "text-gray-600 dark:text-gray-400",
        className
      )}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}

export function ThemeToggleRow() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("ear-plug-theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemDark);
      localStorage.removeItem("ear-plug-theme");
    } else {
      root.classList.toggle("dark", theme === "dark");
      localStorage.setItem("ear-plug-theme", theme);
    }
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-surface-dark-secondary rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Dark Mode
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {theme === "system" ? "System" : theme === "dark" ? "On" : "Off"}
          </p>
        </div>
      </div>
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {(["light", "system", "dark"] as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              theme === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {t === "light" && <Sun className="w-4 h-4" />}
            {t === "system" && "Auto"}
            {t === "dark" && <Moon className="w-4 h-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}
