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
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            !selected
              ? "bg-primary-500 text-white"
              : "bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
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
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            selected === value
              ? "text-white"
              : "bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
          style={
            selected === value
              ? { backgroundColor: GENRE_COLORS[value] }
              : undefined
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
