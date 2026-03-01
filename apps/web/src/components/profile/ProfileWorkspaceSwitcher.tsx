"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Music2, Users, X } from "lucide-react";
import { useProfileContext } from "@/hooks/useProfileContext";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";
interface ProfileWorkspaceSwitcherProps {
  className?: string;
  variant?: "card" | "header";
  showNotice?: boolean;
}
export function ProfileWorkspaceSwitcher({
  className,
  variant = "card",
  showNotice = true,
}: ProfileWorkspaceSwitcherProps) {
  const {
    mode,
    bandId,
    bands,
    notice,
    isHydrated,
    isLoadingBands,
    setPersonalMode,
    setBandMode,
    clearNotice,
  } = useProfileContext();
  const currentValue =
    mode === "band" && bandId ? `band:${bandId}` : "personal";
  const isHeader = variant === "header";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => {
    return [
      {
        value: "personal",
        label: "Personal Profile",
        icon: "personal" as const,
      },
      ...bands.map((entry) => ({
        value: `band:${entry.band._id}`,
        label: entry.band.name,
        icon: "band" as const,
      })),
    ];
  }, [bands]);
  const activeOption =
    options.find((option) => option.value === currentValue) ?? options[0];
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);
  const handleSelect = (value: string) => {
    if (value === "personal") {
      setPersonalMode();
      setIsOpen(false);
      return;
    }
    const [, nextBandId] = value.split(":");
    if (nextBandId) {
      setBandMode(nextBandId as Id<"bands">);
    }
    setIsOpen(false);
  };
  if (!isHydrated) {
    return null;
  }
  return (
    <div
      ref={containerRef}
      className={cn(
        isHeader
          ? "min-w-0 relative z-30"
          : "bg-muted border-2 border-border p-4 relative",
        className,
      )}
    >
      {" "}
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          isHeader && "justify-start",
        )}
      >
        {" "}
        {!isHeader && (
          <div className="flex items-center gap-2">
            {" "}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold border",
                mode === "personal"
                  ? "bg-fan/10 border-fan/30 text-fan"
                  : "bg-band/10 border-band/30 text-band",
              )}
            >
              {" "}
              {mode === "personal" ? (
                <Users className="w-3.5 h-3.5" />
              ) : (
                <Music2 className="w-3.5 h-3.5" />
              )}{" "}
              {mode === "personal" ? "Personal" : "Band"}{" "}
            </span>{" "}
            <p className="text-[10px] text-muted-foreground font-semibold">
              {" "}
              Workspace{" "}
            </p>{" "}
          </div>
        )}{" "}
        <div className={cn("relative", isHeader && "max-w-[300px]")}>
          {" "}
          <button
            type="button"
            className={cn(
              "focus:outline-none",
              isHeader
                ? "w-full bg-transparent border border-transparent text-xl font-bold text-foreground pl-0 pr-8 py-0.5 text-left hover:text-fan/90 transition-colors"
                : "w-full bg-card border border-border text-xs text-foreground font-semibold pl-3 pr-8 py-2 text-left hover:border-fan/40 transition-colors",
            )}
            disabled={isLoadingBands}
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            aria-haspopup="menu"
          >
            {" "}
            <span className="truncate block">{activeOption.label}</span>{" "}
          </button>{" "}
          <ChevronDown
            className={cn(
              "w-4 h-4 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transition-transform",
              isOpen && "rotate-180",
              isHeader ? "text-muted-foreground" : "text-muted-foreground",
            )}
          />{" "}
          {isOpen && (
            <div
              role="menu"
              className={cn(
                "absolute mt-2 overflow-hidden bg-card/95 backdrop-blur-xl border-2 border-border shadow-2xl",
                isHeader
                  ? "left-0 w-[320px] max-w-[calc(100vw-2rem)]"
                  : "right-0 w-full",
              )}
            >
              {" "}
              <div className="max-h-72 overflow-y-auto">
                {" "}
                {options.map((option) => {
                  const isActive = option.value === currentValue;
                  const isPersonal = option.icon === "personal";
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "w-full px-3 py-2.5 border-b border-border last:border-0 flex items-center justify-between gap-2 text-left transition-colors",
                        isActive
                          ? "bg-fan/10 text-fan"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {" "}
                      <span className="flex items-center gap-2 min-w-0">
                        {" "}
                        {isPersonal ? (
                          <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <Music2 className="w-3.5 h-3.5 flex-shrink-0" />
                        )}{" "}
                        <span className="truncate text-xs font-bold ">
                          {" "}
                          {option.label}{" "}
                        </span>{" "}
                      </span>{" "}
                      {isActive && (
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      )}{" "}
                    </button>
                  );
                })}{" "}
              </div>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {showNotice && notice && (
        <div className="mt-3 flex items-center justify-between gap-2 border border-amber-400/40 bg-amber-500/10 px-3 py-2">
          {" "}
          <p className="text-[11px] text-amber-300 font-semibold">
            {" "}
            {notice}{" "}
          </p>{" "}
          <button
            type="button"
            onClick={clearNotice}
            className="p-1 border border-amber-400/30 text-amber-300 hover:bg-amber-500/10"
          >
            {" "}
            <X className="w-3.5 h-3.5" />{" "}
          </button>{" "}
        </div>
      )}{" "}
    </div>
  );
}
