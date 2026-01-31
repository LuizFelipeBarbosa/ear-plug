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
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Distance Filter
          </span>
        </div>
        <button
          onClick={onRequestLocation}
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl",
            "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
            "hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Distance
        </span>
        <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
          {value} {value === 1 ? "mile" : "miles"}
        </span>
      </div>

      {/* Slider */}
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
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-gray-200 dark:bg-gray-700",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-primary-500",
            "[&::-webkit-slider-thumb]:shadow-lg",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-transform",
            isDragging && "[&::-webkit-slider-thumb]:scale-110",
            "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-primary-500",
            "[&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:shadow-lg",
            "[&::-moz-range-thumb]:cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          style={{
            background: `linear-gradient(to right, rgb(124, 58, 237) ${((value - min) / (max - min)) * 100}%, rgb(229, 231, 235) ${((value - min) / (max - min)) * 100}%)`,
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
              "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors",
              value === preset
                ? "bg-primary-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {preset}mi
          </button>
        ))}
      </div>

      {/* Location indicator */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <MapPin className="w-3 h-3" />
        <span>Showing events within {value} miles of your location</span>
      </div>
    </div>
  );
}
