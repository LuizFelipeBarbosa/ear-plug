"use client";

import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";

interface GenreFilterProps {
  selected?: Genre;
  onSelect: (genre: Genre | undefined) => void;
  showAll?: boolean;
  className?: string;
}

export function GenreFilter({
  selected,
  onSelect,
  showAll = false,
  className,
}: GenreFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {showAll && (
        <button
          onClick={() => onSelect(undefined)}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-2 touch-target",
            !selected
              ? "bg-lime text-night border-lime"
              : "bg-night-tertiary border-zinc-800 text-zinc-400 hover:border-lime/30"
          )}
        >
          All
        </button>
      )}
      {GENRES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value === selected ? undefined : value)}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-2 touch-target",
            selected === value
              ? "text-night border-transparent"
              : "bg-night-tertiary border-zinc-800 text-zinc-400 hover:border-lime/30"
          )}
          style={
            selected === value
              ? { backgroundColor: GENRE_COLORS[value], borderColor: GENRE_COLORS[value] }
              : undefined
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
