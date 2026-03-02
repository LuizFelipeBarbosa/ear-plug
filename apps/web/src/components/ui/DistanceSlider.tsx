"use client";
import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleTone } from "@/lib/ui/roleTone";
interface DistanceSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  hasLocation?: boolean;
  onRequestLocation?: () => void;
  loading?: boolean;
  tone?: RoleTone;
}
const DISTANCE_PRESETS = [5, 10, 25, 50];
export function DistanceSlider({
  value,
  onChange,
  min = 1,
  max = 50,
  step = 1,
  disabled = false,
  hasLocation = false,
  onRequestLocation,
  loading = false,
  tone = "fan",
}: DistanceSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const accent = tone === "fan" ? "#2563eb" : "#7c3aed";
  const accentClass =
    tone === "fan" ? "bg-fan border-fan" : "bg-band border-band";
  if (!hasLocation) {
    return (
      <div className="space-y-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <span className="text-xs font-medium text-muted-foreground">
            Distance Filter
          </span>{" "}
        </div>{" "}
        <button
          onClick={onRequestLocation}
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md",
            "bg-muted border border-border text-foreground",
            "hover:bg-muted/80 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "text-sm font-medium touch-target",
          )}
          style={{ color: "oklch(var(--foreground))" }}
        >
          {" "}
          {loading ? (
            <>
              {" "}
              <div className="w-4 h-4 border-2 border-fan border-t-transparent rounded-full animate-spin" />{" "}
              <span>Getting location...</span>{" "}
            </>
          ) : (
            <>
              {" "}
              <Navigation className="w-4 h-4" />{" "}
              <span>Enable location for distance filtering</span>{" "}
            </>
          )}{" "}
        </button>{" "}
      </div>
    );
  }
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-3">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <span className="text-xs font-medium text-muted-foreground">
          Distance
        </span>{" "}
        <span className="text-sm font-medium" style={{ color: accent }}>
          {" "}
          {value} {value === 1 ? "mile" : "miles"}{" "}
        </span>{" "}
      </div>{" "}
      <div className="relative">
        {" "}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className={cn(
            "w-full h-2 appearance-none cursor-pointer rounded-md bg-zinc-300 dark:bg-zinc-700",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-fan",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-transform",
            isDragging && "[&::-webkit-slider-thumb]:scale-110",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          style={{
            background: `linear-gradient(to right, ${accent} ${progress}%, rgb(161 161 170) ${progress}%)`,
          }}
        />{" "}
      </div>{" "}
      <div className="flex gap-2">
        {" "}
        {DISTANCE_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            disabled={disabled}
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-medium transition-all border rounded-md touch-target",
              value === preset
                ? cn("text-foreground", accentClass)
                : "bg-muted border-border text-muted-foreground hover:border-muted-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {" "}
            {preset}mi{" "}
          </button>
        ))}{" "}
      </div>{" "}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {" "}
        <MapPin className="w-3 h-3" />{" "}
        <span>Showing events within {value} miles of your location</span>{" "}
      </div>{" "}
    </div>
  );
}
