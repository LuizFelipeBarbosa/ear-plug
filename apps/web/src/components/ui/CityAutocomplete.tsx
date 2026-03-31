"use client";

/// <reference types="google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, X, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface FormattableTextLike {
  toString(): string;
}

interface PlaceLike {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: google.maps.LatLng | google.maps.LatLngLiteral;
  nationalPhoneNumber?: string;
  websiteURI?: string;
  addressComponents?: google.maps.GeocoderAddressComponent[];
  fetchFields(request: { fields: string[] }): Promise<unknown>;
}

interface PlacePredictionLike {
  text?: FormattableTextLike;
  mainText?: FormattableTextLike;
  secondaryText?: FormattableTextLike;
  placeId?: string;
  toPlace?: () => PlaceLike;
}

interface VenueSuggestion extends CitySuggestion {
  placePrediction: PlacePredictionLike;
}

type AutocompleteFetcher = (request: unknown) => Promise<{ suggestions?: unknown[] }>;

const CITY_PRIMARY_TYPES = ["(cities)"];
const CITY_PRIMARY_TYPES_FALLBACK = ["locality"];

function toDisplayText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toString?: () => string }).toString === "function"
  ) {
    return (value as { toString: () => string }).toString().trim();
  }

  return "";
}

function parseVenueSuggestion(
  rawSuggestion: unknown,
  index: number,
): VenueSuggestion | null {
  if (!rawSuggestion || typeof rawSuggestion !== "object") {
    return null;
  }

  const suggestionRecord = rawSuggestion as Record<string, unknown>;
  const rawPrediction = suggestionRecord.placePrediction;
  if (!rawPrediction || typeof rawPrediction !== "object") {
    return null;
  }

  const predictionRecord = rawPrediction as Record<string, unknown>;
  const placePrediction = rawPrediction as PlacePredictionLike;
  const fullText = toDisplayText(placePrediction.text);

  if (!fullText) {
    return null;
  }

  const parts = fullText
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const primaryText = toDisplayText(placePrediction.mainText) || parts[0] || fullText;
  const secondaryText =
    toDisplayText(placePrediction.secondaryText) ||
    (parts.length > 1 ? parts.slice(1).join(", ") : undefined);
  const placeId =
    typeof placePrediction.placeId === "string" && placePrediction.placeId.length > 0
      ? placePrediction.placeId
      : `${fullText}-${index}`;

  return { placeId, primaryText, secondaryText, fullText, placePrediction };
}

function parseCitySuggestion(rawSuggestion: unknown, index: number): CitySuggestion | null {
  const suggestion = parseVenueSuggestion(rawSuggestion, index);
  if (!suggestion) {
    return null;
  }

  return {
    placeId: suggestion.placeId,
    primaryText: suggestion.primaryText,
    secondaryText: suggestion.secondaryText,
    fullText: suggestion.fullText,
  };
}

function extractCoordinates(
  location: google.maps.LatLng | google.maps.LatLngLiteral,
): google.maps.LatLngLiteral | null {
  if (
    typeof (location as google.maps.LatLng).lat === "function" &&
    typeof (location as google.maps.LatLng).lng === "function"
  ) {
    return {
      lat: (location as google.maps.LatLng).lat(),
      lng: (location as google.maps.LatLng).lng(),
    };
  }

  if (
    typeof (location as google.maps.LatLngLiteral).lat === "number" &&
    typeof (location as google.maps.LatLngLiteral).lng === "number"
  ) {
    return location as google.maps.LatLngLiteral;
  }

  return null;
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
  const fetchAutocompleteSuggestionsRef = useRef<AutocompleteFetcher | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(controlledValue);
  const [manualErrorInput, setManualErrorInput] = useState(controlledValue);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
      if (value && typeof value === "object") {
        setInputValue(value.name || "");
      }
      return;
    }
    setInputValue(controlledValue);
  }, [value, controlledValue, isVenueMode]);

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
    ) as AutocompleteFetcher;

    fetchAutocompleteSuggestionsRef.current = boundFetcher;
    return boundFetcher;
  }, []);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (placesStatus !== "ready") {
      return;
    }

    const query = inputValue.trim();
    if (!showSuggestions || query.length < 2) {
      setVenueSuggestions([]);
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

        if (isVenueMode) {
          result = await fetchAutocompleteSuggestions({
            input: query,
            region: "us",
            language: "en-US",
          });
        } else {
          try {
            result = await fetchAutocompleteSuggestions({
              input: query,
              includedPrimaryTypes: CITY_PRIMARY_TYPES,
              region: "us",
              language: "en-US",
            });
          } catch {
            result = await fetchAutocompleteSuggestions({
              input: query,
              includedPrimaryTypes: CITY_PRIMARY_TYPES_FALLBACK,
              region: "us",
              language: "en-US",
            });
          }
        }

        if (requestId !== requestIdRef.current) return;

        if (isVenueMode) {
          const normalizedSuggestions = (result.suggestions ?? [])
            .map((item, index) => parseVenueSuggestion(item, index))
            .filter((item): item is VenueSuggestion => item !== null);

          setVenueSuggestions(normalizedSuggestions);
          setCitySuggestions([]);
        } else {
          const normalizedSuggestions = (result.suggestions ?? [])
            .map((item, index) => parseCitySuggestion(item, index))
            .filter((item): item is CitySuggestion => item !== null);

          setCitySuggestions(normalizedSuggestions);
          setVenueSuggestions([]);
        }
      } catch {
        if (requestId === requestIdRef.current) {
          setVenueSuggestions([]);
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
      if (newValue.length >= 2) {
        setShowSuggestions(true);
      } else {
        setVenueSuggestions([]);
      }
      // Clear selection if user modifies the text after selection
      if (value && typeof value === "object" && newValue !== value.name) {
        onChange(null);
      }
    } else {
      onChange(newValue);
      setShowSuggestions(true);
      if (newValue.length < 2) {
        setCitySuggestions([]);
      }
    }
  };

  // Clear selection
  const handleClear = () => {
    setInputValue("");
    setManualErrorInput("");
    onChange(isVenueMode ? null : "");
    if (isVenueMode) {
      setVenueSuggestions([]);
    } else {
      setCitySuggestions([]);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Extract city from address components (venue mode)
  const extractCity = useCallback(
    (
      addressComponents: google.maps.GeocoderAddressComponent[],
      formattedAddress?: string,
    ): string => {
      const cityComponent =
        addressComponents.find((comp) => comp.types.includes("locality")) ||
        addressComponents.find((comp) => comp.types.includes("postal_town")) ||
        addressComponents.find((comp) =>
          comp.types.includes("administrative_area_level_3")
        ) ||
        addressComponents.find((comp) =>
          comp.types.includes("sublocality_level_1")
        ) ||
        addressComponents.find((comp) => comp.types.includes("sublocality")) ||
        addressComponents.find((comp) => comp.types.includes("neighborhood")) ||
        addressComponents.find((comp) =>
          comp.types.includes("administrative_area_level_2")
        );

      if (cityComponent?.long_name) {
        return cityComponent.long_name;
      }

      if (!formattedAddress) {
        return "";
      }

      const formattedParts = formattedAddress
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      if (formattedParts.length >= 3) {
        return formattedParts[1] ?? "";
      }

      return "";
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
    async (suggestion: VenueSuggestion) => {
      setInputValue(suggestion.fullText);
      setShowSuggestions(false);
      setVenueSuggestions([]);

      try {
        const place = suggestion.placePrediction.toPlace?.();
        if (!place) {
          throw new Error("Selected location could not be loaded.");
        }

        await place.fetchFields({
          fields: [
            "id",
            "displayName",
            "formattedAddress",
            "location",
            "addressComponents",
            "nationalPhoneNumber",
            "websiteURI",
          ],
        });

        if (!place.location) {
          throw new Error("Selected location is missing coordinates.");
        }

        const coordinates = extractCoordinates(place.location);
        if (!coordinates) {
          throw new Error("Selected location returned invalid coordinates.");
        }

        const city = place.addressComponents
          ? extractCity(
              place.addressComponents,
              place.formattedAddress || suggestion.fullText,
            )
          : "";

        const venueData: VenueLocationData = {
          name: place.displayName?.trim() || suggestion.primaryText || "Location",
          address: place.formattedAddress || suggestion.fullText,
          city,
          coordinates,
          placeId: place.id || suggestion.placeId,
          phoneNumber: place.nationalPhoneNumber,
          website: place.websiteURI,
        };

        setPlacesErrorMessage(null);
        onChange(venueData);
      } catch (err) {
        console.error("Error fetching place details:", err);
        setPlacesErrorMessage(
          "Location details could not be loaded. Try another suggestion or enter details manually.",
        );
      }
    },
    [extractCity, onChange]
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
    ? showSuggestions && inputValue.length >= 2 && venueSuggestions.length > 0
    : showSuggestions && inputValue.length >= 2 && citySuggestions.length > 0;

  const isLoadingSuggestions = isVenueMode
    ? showSuggestions && inputValue.length >= 2 && isSearching
    : showSuggestions && inputValue.length >= 2 && isSearching;

  const hasNoResults = isVenueMode
    ? showSuggestions && inputValue.length >= 2 && !isSearching && venueSuggestions.length === 0
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
            isFocused || inputValue ? "text-band" : "text-muted-foreground"
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

      <AnimatePresence>
        {!error && placesErrorMessage && placesStatus === "ready" && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground mt-1.5 ml-1"
          >
            {placesErrorMessage}
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
            inputValue.length >= 2 &&
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
                    key={suggestion.placeId}
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
          inputValue.length === 1 && (
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
