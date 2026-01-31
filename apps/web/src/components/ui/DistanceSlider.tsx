"use client";

import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

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
}: DistanceSliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  if (!hasLocation) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Distance Filter
          </span>
        </div>
        <button
          onClick={onRequestLocation}
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 px-4",
            "bg-night-tertiary border-2 border-lime/30 text-lime",
            "hover:bg-lime/10 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "font-bold uppercase text-xs tracking-wider touch-target"
          )}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-lime border-t-transparent animate-spin" />
              <span>Getting location...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              <span>Enable location for distance filter</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Distance
        </span>
        <span className="text-sm font-bold text-lime">
          {value} {value === 1 ? "mile" : "miles"}
        </span>
      </div>

      {/* Slider - Brutalist Style */}
      <div className="relative">
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
            "w-full h-2 appearance-none cursor-pointer bg-zinc-800",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5",
            "[&::-webkit-slider-thumb]:bg-lime",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-night",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-transform",
            isDragging && "[&::-webkit-slider-thumb]:scale-125",
            "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5",
            "[&::-moz-range-thumb]:bg-lime",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-night",
            "[&::-moz-range-thumb]:cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          style={{
            background: `linear-gradient(to right, #C2FF00 ${((value - min) / (max - min)) * 100}%, #27272a ${((value - min) / (max - min)) * 100}%)`,
          }}
        />
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {DISTANCE_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            disabled={disabled}
            className={cn(
              "flex-1 py-2 px-2 text-xs font-bold uppercase tracking-wider transition-all border-2 touch-target",
              value === preset
                ? "bg-lime text-night border-lime"
                : "bg-night-tertiary border-zinc-800 text-zinc-400 hover:border-lime/30",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {preset}mi
          </button>
        ))}
      </div>

      {/* Location indicator */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <MapPin className="w-3 h-3 text-violet" />
        <span>Showing events within {value} miles of your location</span>
      </div>
    </div>
  );
}
