"use client";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "ear-plug-theme";
function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved = theme === "system" ? getSystemTheme() : theme;
  root.classList.toggle("dark", resolved === "dark");
}
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const nextTheme = stored ?? "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    if (theme === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme, mounted]);
  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, mounted]);
  if (!mounted) {
    return (
      <div
        className={cn(
          "w-10 h-10 bg-muted border border-border rounded-md animate-pulse",
          className,
        )}
      />
    );
  }
  const options: Array<{ id: Theme; icon: React.ReactNode }> = [
    { id: "light", icon: <Sun className="w-4 h-4" /> },
    { id: "dark", icon: <Moon className="w-4 h-4" /> },
    { id: "system", icon: <Monitor className="w-4 h-4" /> },
  ];
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-card p-1",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setTheme(option.id)}
          className={cn(
            "touch-target-sm inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
            theme === option.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label={`Switch to ${option.id} theme`}
          aria-pressed={theme === option.id}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
export function ThemeToggleRow() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
      <div>
        <h3 className="text-sm font-medium text-foreground">Theme</h3>
        <p className="text-xs text-muted-foreground">
          Light, dark, or follow system
        </p>{" "}
      </div>
      <ThemeToggle />
    </div>
  );
}
