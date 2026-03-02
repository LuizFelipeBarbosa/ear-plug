"use client";

/// <reference types="google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, X, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface CitySuggestion {
  placeId: string;
  primaryText: string;
  secondaryText?: string;
  fullText: string;
}

const CITY_PRIMARY_TYPES = ["(cities)"];
const CITY_PRIMARY_TYPES_FALLBACK = ["locality"];

function parseCitySuggestion(rawSuggestion: unknown, index: number): CitySuggestion | null {
  if (!rawSuggestion || typeof rawSuggestion !== "object") {
    return null;
  }

  const suggestionRecord = rawSuggestion as Record<string, unknown>;
  const rawPrediction = suggestionRecord.placePrediction;
  if (!rawPrediction || typeof rawPrediction !== "object") {
    return null;
  }

  const predictionRecord = rawPrediction as Record<string, unknown>;
  const predictionText = predictionRecord.text;

  const fullText =
    predictionText &&
    typeof (predictionText as { toString?: () => string }).toString === "function"
      ? (predictionText as { toString: () => string }).toString().trim()
      : "";

  if (!fullText) {
    return null;
  }

  const parts = fullText
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const primaryText = parts[0] ?? fullText;
  const secondaryText = parts.length > 1 ? parts.slice(1).join(", ") : undefined;
  const placeId =
    typeof predictionRecord.placeId === "string" && predictionRecord.placeId.length > 0
      ? predictionRecord.placeId
      : `${fullText}-${index}`;

  return { placeId, primaryText, secondaryText, fullText };
}

/**
 * City Autocomplete Component
 *
 * Provides autocomplete functionality that only suggests cities/towns,
 * not street addresses or specific venues.
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
  const controlledValue = value ?? "";
  const [placesStatus, setPlacesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [placesErrorMessage, setPlacesErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const fetchAutocompleteSuggestionsRef = useRef<
    ((request: unknown) => Promise<{ suggestions?: unknown[] }>) | null
  >(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(controlledValue);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function initializePlacesLibrary() {
      const result = await ensurePlacesLibrary();
      if (isCancelled) return;

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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync external value with local input
  useEffect(() => {
    setInputValue(controlledValue);
  }, [controlledValue]);

  const getFetchAutocompleteSuggestions = useCallback(async () => {
    if (fetchAutocompleteSuggestionsRef.current) {
      return fetchAutocompleteSuggestionsRef.current;
    }

    const placesLibrary = (await window.google.maps.importLibrary(
      "places"
    )) as unknown as {
      AutocompleteSuggestion?: {
        fetchAutocompleteSuggestions: (request: unknown) => Promise<{ suggestions?: unknown[] }>;
      };
    };

    const autocompleteSuggestionClass =
      placesLibrary.AutocompleteSuggestion ??
      (
        window.google.maps.places as unknown as {
          AutocompleteSuggestion?: {
            fetchAutocompleteSuggestions: (request: unknown) => Promise<{ suggestions?: unknown[] }>;
          };
        }
      ).AutocompleteSuggestion;

    const fetchAutocompleteSuggestions =
      autocompleteSuggestionClass?.fetchAutocompleteSuggestions;

    if (typeof fetchAutocompleteSuggestions !== "function") {
      throw new Error("Google Maps AutocompleteSuggestion is unavailable.");
    }

    const boundFetcher = fetchAutocompleteSuggestions.bind(
      autocompleteSuggestionClass
    ) as (request: unknown) => Promise<{ suggestions?: unknown[] }>;

    fetchAutocompleteSuggestionsRef.current = boundFetcher;
    return boundFetcher;
  }, []);

  useEffect(() => {
    if (placesStatus !== "ready") {
      return;
    }

    const query = inputValue.trim();
    if (!showSuggestions || query.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const fetchAutocompleteSuggestions = await getFetchAutocompleteSuggestions();

        let result: { suggestions?: unknown[] };

        try {
          result = await fetchAutocompleteSuggestions({
            input: query,
            includedPrimaryTypes: CITY_PRIMARY_TYPES,
          });
        } catch {
          result = await fetchAutocompleteSuggestions({
            input: query,
            includedPrimaryTypes: CITY_PRIMARY_TYPES_FALLBACK,
          });
        }

        if (requestId !== requestIdRef.current) return;

        const normalizedSuggestions = (result.suggestions ?? [])
          .map((item, index) => parseCitySuggestion(item, index))
          .filter((item): item is CitySuggestion => item !== null);

        setSuggestions(normalizedSuggestions);
      } catch {
        if (requestId === requestIdRef.current) {
          setSuggestions([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [inputValue, getFetchAutocompleteSuggestions, placesStatus, showSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSelect = useCallback(
    (suggestion: CitySuggestion) => {
      setInputValue(suggestion.fullText);
      onChange(suggestion.fullText);
      setShowSuggestions(false);
      setSuggestions([]);
    },
    [onChange]
  );

  // Render loading state
  if (placesStatus === "loading") {
    return (
      <div className="w-full">
        {label && (
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
          <input
            type="text"
            value=""
            disabled
            placeholder="Loading locations..."
            className="w-full pl-12 pr-4 py-3.5 bg-muted/50 border border-border rounded-xl text-muted-foreground"
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
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <MapPin className="w-5 h-5 text-red-500" />
          </div>
          <input
            type="text"
            value={controlledValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter city manually"
            className={cn(
              "w-full pl-12 pr-4 py-3.5 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:ring-2 focus:ring-band/10 transition-all",
              error ? "border-red-500" : "border-border"
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {placesErrorMessage || "Autocomplete unavailable. Type your city name manually."}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      {label && (
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Map Pin Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin
            className={cn(
              "w-5 h-5 transition-colors",
              isFocused || controlledValue ? "text-band" : "text-muted-foreground"
            )}
          />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full pl-12 pr-10 py-3.5 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-band/10 transition-all",
            error
              ? "border-red-500 focus:border-red-500"
              : isFocused
              ? "border-band/50"
              : "border-border hover:border-muted-foreground/30",
            controlledValue && !isFocused && "border-band/30"
          )}
        />

        {/* Clear Button */}
        <AnimatePresence>
          {inputValue && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-0 bottom-0 flex items-center justify-center w-8 hover:bg-muted rounded-lg transition-colors m-auto h-8"
              tabIndex={-1}
            >
              <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-500 mt-1.5 ml-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && inputValue.length >= 2 && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border shadow-xl rounded-xl overflow-hidden"
          >
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion.placeId}
                type="button"
                onClick={() => handleSelect(suggestion)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0 group"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-band transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-medium truncate group-hover:text-band transition-colors">
                      {suggestion.primaryText}
                    </p>
                    {suggestion.secondaryText && (
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.secondaryText}
                      </p>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Searching state */}
      <AnimatePresence>
        {showSuggestions && inputValue.length >= 2 && isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border shadow-xl rounded-xl p-4"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Searching cities...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      <AnimatePresence>
        {showSuggestions &&
          inputValue.length >= 2 &&
          !isSearching &&
          suggestions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border shadow-xl rounded-xl p-4 text-center"
            >
              <Search className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No cities found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Typing hint */}
      <AnimatePresence>
        {showSuggestions && inputValue.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border shadow-xl rounded-xl p-3 text-center"
          >
            <p className="text-xs text-muted-foreground">
              Keep typing to see city suggestions...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
