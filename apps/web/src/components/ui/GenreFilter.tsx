"use client";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import type { ColorStrategy, RoleTone } from "@/lib/ui/roleTone";
interface GenreFilterProps {
  selected?: Genre;
  onSelect: (genre: Genre | undefined) => void;
  showAll?: boolean;
  className?: string;
  tone?: RoleTone;
  colorStrategy?: ColorStrategy;
}
export function GenreFilter({
  selected,
  onSelect,
  showAll = false,
  className,
  tone = "fan",
  colorStrategy = "role",
}: GenreFilterProps) {
  const activeToneClass =
    tone === "fan"
      ? "bg-fan border-fan text-fan-foreground"
      : "bg-band border-band text-band-foreground";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {" "}
      {showAll && (
        <button
          onClick={() => onSelect(undefined)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-all border rounded-md touch-target",
            !selected
              ? activeToneClass
              : "bg-muted border-border text-muted-foreground hover:border-zinc-500",
          )}
        >
          {" "}
          All{" "}
        </button>
      )}{" "}
      {GENRES.map(({ value, label }) => {
        const isActive = selected === value;
        const useGenreColor = isActive && colorStrategy === "genre";
        return (
          <button
            key={value}
            onClick={() => onSelect(value === selected ? undefined : value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all border rounded-md touch-target",
              isActive
                ? useGenreColor
                  ? "text-foreground border-transparent"
                  : activeToneClass
                : "bg-muted border-border text-muted-foreground hover:border-muted-foreground",
            )}
            style={
              useGenreColor
                ? {
                    backgroundColor: GENRE_COLORS[value],
                    borderColor: GENRE_COLORS[value],
                  }
                : undefined
            }
          >
            {" "}
            {label}{" "}
          </button>
        );
      })}{" "}
    </div>
  );
}
