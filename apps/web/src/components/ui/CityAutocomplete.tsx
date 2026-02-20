"use client";

/// <reference types="google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { MapPin, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ensurePlacesLibrary } from "@/lib/google/ensurePlacesLibrary";

interface CityAutocompleteProps {
  value?: string;
  onChange: (city: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  error?: string;
}

/**
 * City Autocomplete Component
 * 
 * Provides autocomplete functionality that only suggests cities/towns,
 * not street addresses or specific venues.
 * 
 * Uses Google Places API with type filter set to "(cities)" to ensure
 * only city-level results are shown.
 */
export function CityAutocomplete({
  value = "",
  onChange,
  placeholder = "Enter a city...",
  disabled = false,
  required = false,
  label = "Location",
  error,
}: CityAutocompleteProps) {
  const [placesStatus, setPlacesStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [placesErrorMessage, setPlacesErrorMessage] = useState<string | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function initializePlacesLibrary() {
      const result = await ensurePlacesLibrary();
      if (isCancelled) {
        return;
      }

      if (result.ready) {
        setPlacesStatus("ready");
        setPlacesErrorMessage(null);
        return;
      }

      setPlacesStatus("error");
      setPlacesErrorMessage(result.message);
    }

    void initializePlacesLibrary();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize usePlacesAutocomplete with city-only filter
  const autocompleteHook = usePlacesAutocomplete({
    debounce: 200,
    requestOptions: {
      // Only suggest cities, not addresses or venues
      types: ["(cities)"],
    },
  });

  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = autocompleteHook;

  // Sync external value with input
  useEffect(() => {
    setValue(value || "", false);
  }, [value, setValue]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange(newValue);
    if (newValue.length >= 2) {
      setShowSuggestions(true);
    }
  };

  // Clear selection
  const handleClear = () => {
    setValue("", false);
    onChange("");
    clearSuggestions();
    inputRef.current?.focus();
  };

  // Handle city selection
  const handleSelect = useCallback(
    async (suggestion: google.maps.places.AutocompletePrediction) => {
      // Extract just the city name and state/country
      const cityText = suggestion.structured_formatting.main_text;
      const secondaryText = suggestion.structured_formatting.secondary_text;
      const fullCity = secondaryText ? `${cityText}, ${secondaryText}` : cityText;
      
      setValue(fullCity, false);
      onChange(fullCity);
      setShowSuggestions(false);
      clearSuggestions();
    },
    [clearSuggestions, onChange, setValue]
  );

  // Render loading state
  if (placesStatus === "loading") {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            {label}
            {required && <span className="text-lime ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
          <input
            type="text"
            disabled
            placeholder="Loading Google Maps..."
            className="w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 border-zinc-800 text-zinc-500 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      </div>
    );
  }

  // Render error state
  if (placesStatus === "error") {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            {label}
            {required && <span className="text-lime ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <MapPin className="w-5 h-5 text-red-500" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter city manually"
            className="w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-lime"
          />
        </div>
        <p className="text-xs text-zinc-600 mt-1.5">
          {placesErrorMessage || "Autocomplete unavailable. Type your city name manually."}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
          {label}
          {required && <span className="text-lime ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Map Pin Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin
            className={cn(
              "w-5 h-5 transition-colors",
              value ? "text-violet" : "text-zinc-600"
            )}
          />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          disabled={disabled || !ready}
          placeholder={placeholder}
          className={cn(
            "w-full pl-12 pr-10 py-3.5 bg-night-tertiary border-2 text-white placeholder:text-zinc-600 focus:outline-none transition-colors",
            error
              ? "border-red-500 focus:border-red-400"
              : "border-zinc-800 focus:border-violet",
            value && "border-violet/30"
          )}
        />

        {/* Clear Button */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 flex items-center justify-center hover:bg-zinc-800 transition-colors touch-target"
            tabIndex={-1}
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 mt-1.5 font-medium uppercase tracking-wider">
          {error}
        </p>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && inputValue.length >= 2 && status === "OK" && data.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-night-secondary border-2 border-zinc-800 shadow-xl max-h-64 overflow-y-auto">
          {data.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-night-tertiary hover:border-lime/30 transition-colors border-b border-zinc-800/50 last:border-0 group"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0 group-hover:text-violet transition-colors" />
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate group-hover:text-violet transition-colors">
                    {suggestion.structured_formatting.main_text}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showSuggestions && inputValue.length >= 2 && status === "ZERO_RESULTS" && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-night-secondary border-2 border-zinc-800 shadow-xl p-4 text-center">
          <p className="text-sm text-zinc-500">No cities found</p>
        </div>
      )}

      {/* Typing hint */}
      {showSuggestions && inputValue.length === 1 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-night-secondary border-2 border-zinc-800 shadow-xl p-3 text-center">
          <p className="text-xs text-zinc-500">Keep typing to see city suggestions...</p>
        </div>
      )}
    </div>
  );
}
