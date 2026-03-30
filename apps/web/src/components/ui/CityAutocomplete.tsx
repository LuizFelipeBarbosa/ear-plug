"use client";

/// <reference types="google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, X, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import usePlacesAutocomplete from "use-places-autocomplete";
import { cn } from "@/lib/utils";
import { ensurePlacesLibrary } from "@/lib/google/ensurePlacesLibrary";
import type { VenueLocationData } from "@/types";

export type { VenueLocationData };

type SuggestionMode = "city" | "venue";

interface CityAutocompleteProps {
  value?: string | VenueLocationData | null;
  onChange: (value: string | VenueLocationData | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  error?: string;
  /**
   * "city" - Only suggests cities/towns
   * "venue" - Suggests any place (venues, addresses, specific locations)
   */
  mode?: SuggestionMode;
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
 * Location Autocomplete Component
 *
 * Supports two modes:
 * - "city": Only suggests cities/towns (for user profiles, band locations)
 * - "venue": Suggests any place including specific addresses and venues (for event creation)
 *
 * Automatically extracts:
 * - Venue/Location Name
 * - Full Address
 * - City
 * - Coordinates (lat/lng) - venue mode only
 * - Place ID
 */
export function CityAutocomplete({
  value = "",
  onChange,
  placeholder = "Enter a location...",
  disabled = false,
  required = false,
  label = "Location",
  error,
  mode = "city",
}: CityAutocompleteProps) {
  const isVenueMode = mode === "venue";

  // For city mode: value is string
  // For venue mode: value can be VenueLocationData
  const controlledValue =
    isVenueMode && value && typeof value === "object"
      ? (value as VenueLocationData).name || ""
      : (value as string) || "";

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
  const [manualErrorInput, setManualErrorInput] = useState(controlledValue);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Venue mode: use use-places-autocomplete
  const autocompleteHook = usePlacesAutocomplete({
    debounce: 200,
    requestOptions: isVenueMode ? undefined : {}, // Don't run in city mode
  });

  const {
    ready: venueReady,
    value: venueInputValue,
    suggestions: { status: venueStatus, data: venueSuggestions },
    setValue: setVenueValue,
    clearSuggestions: clearVenueSuggestions,
  } = autocompleteHook;

  // Initialize Places Library
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
    if (isVenueMode) {
      // For venue mode, sync with the hook's value if we have a VenueLocationData object
      if (value && typeof value === "object") {
        setVenueValue(value.name, false);
      }
    }
    setInputValue(controlledValue);
  }, [value, controlledValue, isVenueMode, setVenueValue]);

  // Keep the manual fallback input in sync with externally controlled selections.
  useEffect(() => {
    if (controlledValue) {
      setManualErrorInput(controlledValue);
      return;
    }

    if (!isVenueMode) {
      setManualErrorInput(controlledValue);
    }
  }, [controlledValue, isVenueMode]);

  // City mode: fetch suggestions
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

  // City mode: fetch city suggestions
  useEffect(() => {
    if (isVenueMode || placesStatus !== "ready") {
      return;
    }

    const query = inputValue.trim();
    if (!showSuggestions || query.length < 2) {
      setCitySuggestions([]);
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

        setCitySuggestions(normalizedSuggestions);
      } catch {
        if (requestId === requestIdRef.current) {
          setCitySuggestions([]);
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
  }, [inputValue, getFetchAutocompleteSuggestions, placesStatus, showSuggestions, isVenueMode]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (isVenueMode) {
      setVenueValue(newValue);
      if (newValue.length >= 2) {
        setShowSuggestions(true);
      }
      // Clear selection if user modifies the text after selection
      if (value && newValue !== (value as VenueLocationData).name) {
        onChange(null);
      }
    } else {
      onChange(newValue);
      setShowSuggestions(true);
    }
  };

  // Clear selection
  const handleClear = () => {
    setInputValue("");
    setManualErrorInput("");
    onChange(isVenueMode ? null : "");
    if (isVenueMode) {
      setVenueValue("", false);
      clearVenueSuggestions();
    } else {
      setCitySuggestions([]);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Extract city from address components (venue mode)
  const extractCity = useCallback(
    (addressComponents: google.maps.GeocoderAddressComponent[]): string => {
      const cityComponent =
        addressComponents.find((comp) => comp.types.includes("locality")) ||
        addressComponents.find((comp) => comp.types.includes("sublocality")) ||
        addressComponents.find((comp) =>
          comp.types.includes("administrative_area_level_2")
        );
      return cityComponent?.long_name || "";
    },
    []
  );

  // Handle city selection (city mode)
  const handleCitySelect = useCallback(
    (suggestion: CitySuggestion) => {
      setInputValue(suggestion.fullText);
      onChange(suggestion.fullText);
      setShowSuggestions(false);
      setCitySuggestions([]);
    },
    [onChange]
  );

  // Handle venue selection (venue mode)
  const handleVenueSelect = useCallback(
    async (suggestion: google.maps.places.AutocompletePrediction) => {
      setVenueValue(suggestion.description, false);
      setInputValue(suggestion.description);
      setShowSuggestions(false);
      clearVenueSuggestions();

      if (typeof window === "undefined" || !window.google?.maps?.places) {
        console.error("Google Maps not loaded");
        return;
      }

      try {
        const placesService = new window.google.maps.places.PlacesService(
          document.createElement("div")
        );

        placesService.getDetails(
          {
            placeId: suggestion.place_id,
            fields: [
              "name",
              "formatted_address",
              "geometry",
              "place_id",
              "formatted_phone_number",
              "website",
              "address_components",
            ],
          },
          (place, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place &&
              place.geometry &&
              place.geometry.location
            ) {
              const city = place.address_components
                ? extractCity(place.address_components)
                : "";

              let name = place.name || "";
              if (!name || name === place.formatted_address) {
                const streetNumber = place.address_components?.find((c) =>
                  c.types.includes("street_number")
                )?.long_name;
                const route = place.address_components?.find((c) =>
                  c.types.includes("route")
                )?.long_name;
                name =
                  streetNumber && route
                    ? `${streetNumber} ${route}`
                    : suggestion.terms[0]?.value || "Location";
              }

              const venueData: VenueLocationData = {
                name,
                address: place.formatted_address || suggestion.description,
                city,
                coordinates: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                },
                placeId: suggestion.place_id,
                phoneNumber: place.formatted_phone_number,
                website: place.website,
              };

              onChange(venueData);
            }
          }
        );
      } catch (err) {
        console.error("Error fetching place details:", err);
      }
    },
    [clearVenueSuggestions, extractCity, onChange, setVenueValue]
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
            value={manualErrorInput}
            onChange={(e) => {
              const nextValue = e.target.value;
              setManualErrorInput(nextValue);
              onChange(isVenueMode ? null : nextValue);
            }}
            placeholder={isVenueMode ? "Enter location manually" : "Enter city manually"}
            className={cn(
              "w-full pl-12 pr-4 py-3.5 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:ring-2 focus:ring-band/10 transition-all",
              error ? "border-red-500" : "border-border"
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {placesErrorMessage ||
            (isVenueMode
              ? "Autocomplete unavailable. Type details manually."
              : "Autocomplete unavailable. Type your city name manually.")}
        </p>
      </div>
    );
  }

  // Determine if we have selected venue data to show
  const hasSelectedVenue = isVenueMode && value && typeof value === "object";
  const selectedVenue = hasSelectedVenue ? (value as VenueLocationData) : null;

  const hasSuggestions = isVenueMode
    ? showSuggestions && venueInputValue.length >= 2 && venueStatus === "OK" && venueSuggestions.length > 0
    : showSuggestions && inputValue.length >= 2 && citySuggestions.length > 0;

  const isLoadingSuggestions = isVenueMode
    ? false // use-places-autocomplete doesn't expose loading state, data is async but instant
    : showSuggestions && inputValue.length >= 2 && isSearching;

  const hasNoResults = isVenueMode
    ? showSuggestions && venueInputValue.length >= 2 && venueStatus === "ZERO_RESULTS"
    : showSuggestions && inputValue.length >= 2 && !isSearching && citySuggestions.length === 0;

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
          disabled={disabled || (isVenueMode && !venueReady)}
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

      {/* Selected Venue Info (venue mode only) */}
      <AnimatePresence>
        {selectedVenue && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-4 bg-band/5 border border-band/20 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-band mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selectedVenue.name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedVenue.address}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-md">
                    {selectedVenue.city}
                  </span>
                  <span className="break-all text-[10px] text-muted-foreground">
                    {selectedVenue.coordinates.lat.toFixed(4)}, {selectedVenue.coordinates.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {isVenueMode
          ? showSuggestions &&
            venueInputValue.length >= 2 &&
            venueStatus === "OK" &&
            venueSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full z-[80] mt-2 max-h-[min(18rem,40vh)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card shadow-xl"
              >
                {venueSuggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleVenueSelect(suggestion)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0 group"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-band transition-colors" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-medium truncate group-hover:text-band transition-colors">
                          {suggestion.structured_formatting.main_text}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {suggestion.structured_formatting.secondary_text}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )
          : showSuggestions &&
            inputValue.length >= 2 &&
            citySuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full z-[80] mt-2 max-h-[min(18rem,40vh)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card shadow-xl"
              >
                {citySuggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion.placeId}
                    type="button"
                    onClick={() => handleCitySelect(suggestion)}
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
        {isLoadingSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border shadow-xl rounded-xl p-4"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Searching {isVenueMode ? "locations" : "cities"}...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      <AnimatePresence>
        {hasNoResults && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border shadow-xl rounded-xl p-4 text-center"
          >
            <Search className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No {isVenueMode ? "locations" : "cities"} found
            </p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing hint */}
      <AnimatePresence>
        {showSuggestions &&
          (isVenueMode ? venueInputValue.length === 1 : inputValue.length === 1) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-50 left-0 right-0 top-full mt-2 bg-card border border-border shadow-xl rounded-xl p-3 text-center"
            >
              <p className="text-xs text-muted-foreground">
                Keep typing to see {isVenueMode ? "location" : "city"} suggestions...
              </p>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
