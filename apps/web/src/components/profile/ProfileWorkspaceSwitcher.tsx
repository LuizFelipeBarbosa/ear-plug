"use client";

import { ChevronDown, Music2, Users, X } from "lucide-react";
import { useProfileContext } from "@/hooks/useProfileContext";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface ProfileWorkspaceSwitcherProps {
  className?: string;
}

export function ProfileWorkspaceSwitcher({
  className,
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

  if (!isHydrated) {
    return null;
  }

  const currentValue = mode === "band" && bandId ? `band:${bandId}` : "personal";

  return (
    <div className={cn("bg-night-tertiary border-2 border-zinc-800 p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border",
              mode === "personal"
                ? "bg-lime/10 border-lime/30 text-lime"
                : "bg-violet/10 border-violet/30 text-violet"
            )}
          >
            {mode === "personal" ? (
              <Users className="w-3.5 h-3.5" />
            ) : (
              <Music2 className="w-3.5 h-3.5" />
            )}
            {mode === "personal" ? "Personal" : "Band"}
          </span>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
            Workspace
          </p>
        </div>

        <div className="relative">
          <select
            className="appearance-none bg-night-secondary border border-zinc-700 text-xs text-white uppercase tracking-wider font-semibold pl-3 pr-8 py-2 focus:outline-none focus:border-lime"
            value={currentValue}
            disabled={isLoadingBands}
            onChange={(event) => {
              const next = event.target.value;
              if (next === "personal") {
                setPersonalMode();
                return;
              }

              const [, nextBandId] = next.split(":");
              if (nextBandId) {
                setBandMode(nextBandId as Id<"bands">);
              }
            }}
          >
            <option value="personal">Personal</option>
            {bands.map((entry) => (
              <option key={entry.band._id} value={`band:${entry.band._id}`}>
                {entry.band.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-500 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {notice && (
        <div className="mt-3 flex items-center justify-between gap-2 border border-amber-400/40 bg-amber-500/10 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
            {notice}
          </p>
          <button
            type="button"
            onClick={clearNotice}
            className="p-1 border border-amber-400/30 text-amber-300 hover:bg-amber-500/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
