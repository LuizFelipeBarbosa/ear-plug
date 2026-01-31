"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark"); // Default to dark for brutalist theme
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
      <div className={cn("w-10 h-10 bg-night-tertiary border-2 border-zinc-800 animate-pulse", className)} />
    );
  }

  // Force dark mode for brutalist theme - toggle just shows current state
  const isDark = true;

  return (
    <button
      onClick={() => {}} // No-op since we force dark mode
      className={cn(
        "p-2.5 flex items-center justify-center transition-colors border-2 border-zinc-800 bg-night-tertiary",
        "text-lime",
        className
      )}
      title="Dark mode is always on"
      disabled
    >
      <Moon className="w-5 h-5" />
    </button>
  );
}

export function ThemeToggleRow() {
  const [theme, setTheme] = useState<Theme>("dark");
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
    // Force dark mode for brutalist theme
    document.documentElement.classList.add("dark");
    setTheme("dark");
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center">
          <Moon className="w-5 h-5 text-lime" />
        </div>
        <div>
          <h3 className="font-bold text-white uppercase tracking-wide text-sm">
            Dark Mode
          </h3>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Always on
          </p>
        </div>
      </div>
      <div className="flex border-2 border-zinc-800 bg-night-tertiary">
        <button
          className="px-3 py-2 flex items-center justify-center text-xs font-bold uppercase tracking-wider bg-lime text-night border-r-2 border-zinc-800"
        >
          <Moon className="w-4 h-4" />
        </button>
        <button
          disabled
          className="px-3 py-2 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-zinc-600 opacity-50 cursor-not-allowed"
        >
          <Sun className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
